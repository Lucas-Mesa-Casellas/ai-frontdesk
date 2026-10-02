"""Storing a finished call without ever losing it.

The old flow ran the LLM extraction first and inserted afterwards. If the
extraction was slow or failed, or Retell timed out and retried, a call could be
lost or stored twice. Now:

1. `store_stub` inserts a minimal row at once (transcript, caller number,
   duration, status 'needs_review', Retell's own call id) and is idempotent: a
   retried call_ended finds the row instead of inserting another.
2. `complete_call` runs afterwards (in the background): extraction, then an UPDATE
   of that same row with the extracted fields, the booking, the owner email. If
   anything goes wrong the row simply stays 'needs_review' (and
   scripts/reprocess_needs_review.py can finish it later).
3. `apply_sentiment` attaches Retell's later call_analyzed event to the row.

Everything here takes the Supabase client as an argument, so tests can pass a fake.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.services.ai import extract_call_data
from app.services.notify import notify_owner
from app.services.phone import to_e164
from app.services.scheduling import DEFAULT_APPOINTMENT_MINUTES

BUSINESS_TZ = ZoneInfo("Europe/Madrid")  # only used to label the call start for the extraction prompt

_NULLISH_PHONE_VALUES = {"null", "none", "n/a", "na", ""}


def _is_real_phone(value: str | None) -> bool:
    return bool(value) and value.strip().lower() not in _NULLISH_PHONE_VALUES


def duration_seconds(call_data: dict) -> int | None:
    start, end = call_data.get("start_timestamp"), call_data.get("end_timestamp")
    if start is None or end is None or end < start:
        return None
    return round((end - start) / 1000)


# ---------------------------------------------------------------- stage 1
def store_stub(supabase, business: dict, call_data: dict, transcript: str) -> tuple[str, bool]:
    """Insert the minimal row. Returns (calls.id, created). `created` is False when
    this Retell call id is already stored (a retried or replayed call_ended): the
    caller then does nothing more. If the insert itself fails the exception
    propagates, so the webhook answers 5xx and Retell retries -- the call is not lost."""
    retell_id = call_data.get("call_id")

    def existing():
        found = supabase.table("calls").select("id").eq("retell_call_id", retell_id).limit(1).execute()
        return found.data[0]["id"] if found.data else None

    if retell_id:
        row_id = existing()
        if row_id:
            return row_id, False

    country = business.get("country") or "ES"
    from_number = call_data.get("from_number")
    analysis = call_data.get("call_analysis") or {}
    row = {
        "business_id": business["id"],
        "source": "retell",
        "retell_call_id": retell_id,
        "transcript": transcript,
        "caller_phone": (to_e164(from_number, country) or from_number) if _is_real_phone(from_number) else None,
        "duration_seconds": duration_seconds(call_data),
        "disconnection_reason": call_data.get("disconnection_reason"),
        "user_sentiment": analysis.get("user_sentiment"),
        # until the extraction has run, a human should look at it
        "status": "needs_review",
        "extraction_complete": False,
        "raw_payload": {"stage": "received"},
    }
    try:
        inserted = supabase.table("calls").insert(row).execute()
        return inserted.data[0]["id"], True
    except Exception:
        # two deliveries racing, the unique index on retell_call_id lost one
        if retell_id:
            row_id = existing()
            if row_id:
                return row_id, False
        raise


# ---------------------------------------------------------------- stage 2
def build_update(extracted, raw_payload: dict, caller_phone: str | None) -> dict:
    """The columns the extraction fills in on the stub row."""
    return {
        "caller_name": extracted.caller_name,
        "caller_phone": caller_phone,
        "intent": extracted.intent,
        "summary": extracted.summary,
        "urgency": extracted.urgency,
        "preferred_time": extracted.preferred_time,
        "preferred_time_iso": extracted.preferred_time_iso,
        "next_action": extracted.next_action,
        "booking_type": extracted.booking_type,
        "party_size": extracted.party_size,
        "extraction_complete": extracted.extraction_complete,
        "extraction_confidence": float(extracted.extraction_confidence),
        "missing_fields": extracted.missing_fields,
        "notes": extracted.notes,
        "topic": extracted.topic,
        "outcome_reason": extracted.outcome_reason,
        "raw_payload": raw_payload,
        "ai_extracted_at": datetime.now(timezone.utc).isoformat(),
        "status": "request_captured" if extracted.extraction_complete else "needs_review",
    }


def resolve_caller_phone(extracted, from_number: str | None, country: str) -> str | None:
    """A number the caller actually stated, normalised; else the verified Caller ID;
    never the literal word "null" or a description."""
    stated = extracted.caller_phone if _is_real_phone(extracted.caller_phone) else None
    return to_e164(stated, country) or to_e164(from_number, country) or (from_number if _is_real_phone(from_number) else None)


def ensure_booking(supabase, business: dict, call_id: str, extracted, caller_phone: str | None) -> bool:
    """Create the pending booking for a booking call, once. True if one was created."""
    if not (extracted.extraction_complete and extracted.intent == "book_appointment"):
        return False
    already = supabase.table("bookings").select("id").eq("call_id", call_id).limit(1).execute()
    if already.data:
        return False
    start_iso = extracted.preferred_time_iso
    try:
        end_iso = (datetime.fromisoformat(start_iso) + timedelta(minutes=DEFAULT_APPOINTMENT_MINUTES)).isoformat() if start_iso else None
    except ValueError:
        start_iso, end_iso = None, None
    supabase.table("bookings").insert({
        "business_id": business["id"],
        "call_id": call_id,
        "booking_type": extracted.booking_type,
        "customer_name": extracted.caller_name,
        "customer_phone": caller_phone,
        "party_size": extracted.party_size,
        "notes": extracted.preferred_time,
        "start_time": start_iso,
        "end_time": end_iso,
        # ALWAYS pending: only a human tap on the dashboard confirms (never implied by the agent)
        "status": "pending",
    }).execute()
    return True


def complete_call(supabase, business: dict, call_id: str, call_data: dict, transcript: str) -> str:
    """Extraction + the UPDATE of the stub row + booking + owner email. Never raises:
    whatever fails, the stub row stays as stored (needs_review). Returns a short
    status string for logs and tests."""
    try:
        start_ts = call_data.get("start_timestamp")
        started_iso = (
            datetime.fromtimestamp(start_ts / 1000, tz=BUSINESS_TZ).isoformat()
            if start_ts else datetime.now(BUSINESS_TZ).isoformat()
        )
        extracted, raw_payload = extract_call_data(transcript, started_iso, business.get("language", "es"))
        country = business.get("country") or "ES"
        caller_phone = resolve_caller_phone(extracted, call_data.get("from_number"), country)

        supabase.table("calls").update(build_update(extracted, raw_payload, caller_phone)).eq("id", call_id).execute()
    except Exception as e:  # noqa: BLE001
        print(f"[call_ingest] extraction/update failed for call {call_id}, left as needs_review: {type(e).__name__}: {e}")
        return "left_needs_review"

    try:
        ensure_booking(supabase, business, call_id, extracted, caller_phone)
    except Exception as e:  # noqa: BLE001
        print(f"[call_ingest] booking insert failed for call {call_id}: {type(e).__name__}: {e}")

    # Urgent-only by default: routine requests stay on the dashboard; email is for
    # high-urgency calls and for failed extractions (a human must read the transcript).
    try:
        if extracted.urgency == "high" or not extracted.extraction_complete:
            notify_owner(business, extracted, call_id, caller_phone_override=caller_phone)
    except Exception as e:  # noqa: BLE001
        print(f"[call_ingest] owner notification failed for call {call_id}: {type(e).__name__}: {e}")
    return "completed" if extracted.extraction_complete else "needs_review"


# ---------------------------------------------------------------- call_analyzed
ANALYZED_ATTEMPTS = 4
ANALYZED_DELAY_SECONDS = 2.0


async def apply_sentiment(supabase, call_data: dict) -> str:
    """Retell's call_analyzed event: set user_sentiment on the row with the same
    Retell call id. Only ever UPDATEs, never creates a row. If there is no row yet
    (the event can beat call_ended's insert by a moment) it looks a few more times,
    then drops the event quietly. Never raises."""
    retell_id = call_data.get("call_id")
    sentiment = (call_data.get("call_analysis") or {}).get("user_sentiment")
    if not retell_id or not sentiment:
        return "ignored"
    try:
        for attempt in range(ANALYZED_ATTEMPTS):
            result = supabase.table("calls").update({"user_sentiment": sentiment}).eq("retell_call_id", retell_id).execute()
            if result.data:
                return "updated"
            if attempt < ANALYZED_ATTEMPTS - 1:
                await asyncio.sleep(ANALYZED_DELAY_SECONDS)
    except Exception as e:  # noqa: BLE001
        print(f"[call_ingest] call_analyzed update failed for {retell_id}: {type(e).__name__}: {e}")
        return "error"
    return "no_match"
