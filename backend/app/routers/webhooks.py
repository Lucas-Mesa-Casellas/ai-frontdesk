import json
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from app.services.ai import extract_call_data
from app.services.notify import notify_owner
from app.services.retell_security import verify_retell_signature
from app.services.business_lookup import find_business
from app.services.scheduling import DEFAULT_APPOINTMENT_MINUTES
from app.db.supabase_client import get_supabase_admin
from app.config import get_settings
from app.limiter import limiter

router = APIRouter()

# Disconnection reasons meaning the call never actually connected to a real
# conversation (per Retell's documented disconnection_reason values).
FAILED_DISCONNECTION_REASONS = {"dial_failed", "dial_no_answer", "dial_busy"}
MIN_MEANINGFUL_CALL_DURATION_MS = 5000

@router.post("/webhooks/retell")
@limiter.limit("120/minute")
async def retell_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("x-retell-signature")
    settings = get_settings()

    if not verify_retell_signature(raw_body, signature, settings.retell_api_key):
        print("[webhook] rejected: invalid or missing x-retell-signature")
        raise HTTPException(status_code=401, detail="invalid signature")

    payload = json.loads(raw_body)
    event = payload.get("event")

    # We only care about the moment a call ends
    if event != "call_ended":
        return {"status": "ignored", "event": event}

    call_data = payload.get("call", {})

    # Filter out calls that never really connected or were too short to be
    # a real interaction, so they don't burn margin or count against the
    # client's call quota (confirmed gap, Master Paper v9 §4).
    disconnection_reason = call_data.get("disconnection_reason")
    if disconnection_reason in FAILED_DISCONNECTION_REASONS:
        return {"status": "filtered", "reason": disconnection_reason}

    start_ts = call_data.get("start_timestamp")
    end_ts = call_data.get("end_timestamp")
    if start_ts is not None and end_ts is not None:
        duration_ms = end_ts - start_ts
        if duration_ms < MIN_MEANINGFUL_CALL_DURATION_MS:
            return {"status": "filtered", "reason": "too_short", "duration_ms": duration_ms}

    transcript = call_data.get("transcript", "")
    if not transcript:
        return {"status": "no_transcript"}

    supabase = get_supabase_admin()

    business = find_business(supabase, call_data)
    if not business:
        # No more silent fallback to a hardcoded business — that hid the
        # multi-business bug instead of fixing it. If this fires, either
        # retell_agent_id isn't set for the agent that took the call, or
        # (once live) phone_number doesn't match the DID.
        return {
            "status": "error",
            "detail": "no business matched agent_id or to_number",
            "agent_id": call_data.get("agent_id"),
            "to_number": call_data.get("to_number"),
        }

    # Run the extraction engine we already built and tested
    business_tz = ZoneInfo("Europe/Madrid")  # covers Spain + France (same CET/CEST offset)
    call_started_iso = (
        datetime.fromtimestamp(start_ts / 1000, tz=business_tz).isoformat()
        if start_ts else datetime.now(business_tz).isoformat()
    )
    extracted, raw_payload = extract_call_data(transcript, call_started_iso)

    now = datetime.now(timezone.utc).isoformat()
    call_record = {
        "business_id": business["id"],
        "source": "retell",
        "transcript": transcript,
        "caller_name": extracted.caller_name,
        "caller_phone": extracted.caller_phone,
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
        "raw_payload": raw_payload,
        "ai_extracted_at": now,
        "status": "request_captured" if extracted.extraction_complete else "needs_review",
    }

    result = supabase.table("calls").insert(call_record).execute()
    call_id = result.data[0]["id"]

    # A booking request only exists once the agent actually captured one —
    # not every call is a booking (some are questions, messages, etc).
    if extracted.extraction_complete and extracted.intent == "book_appointment":
        booking_record = {
            "business_id": business["id"],
            "call_id": call_id,
            "booking_type": extracted.booking_type,
            "customer_name": extracted.caller_name,
            "customer_phone": extracted.caller_phone,
            "party_size": extracted.party_size,
            "notes": extracted.preferred_time,
            "start_time": extracted.preferred_time_iso,
            "end_time": (
                (datetime.fromisoformat(extracted.preferred_time_iso) + timedelta(minutes=DEFAULT_APPOINTMENT_MINUTES)).isoformat()
                if extracted.preferred_time_iso else None
            ),
            # ALWAYS pending — only a human tap on the dashboard confirms
            # a booking. The agent never implies one is confirmed (§5.5).
            "status": "pending",
        }
        supabase.table("bookings").insert(booking_record).execute()

    notify_owner(business, extracted, call_id)

    return {"status": "success", "call_id": call_id}
