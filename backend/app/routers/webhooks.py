import json
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from app.services import call_ingest
from app.services.retell_security import verify_retell_signature
from app.services.business_lookup import find_business
from app.services.open_status import business_timezone, open_status, resolve_timezone
from app.db.supabase_client import get_supabase_admin
from app.config import get_settings
from app.limiter import limiter

router = APIRouter()

# Disconnection reasons meaning the call never actually connected to a real
# conversation (per Retell's documented disconnection_reason values).
FAILED_DISCONNECTION_REASONS = {"dial_failed", "dial_no_answer", "dial_busy"}
MIN_MEANINGFUL_CALL_DURATION_MS = 5000

@router.post("/webhooks/retell-inbound")
@limiter.limit("120/minute")
async def retell_inbound_webhook(request: Request):
    """Retell's inbound-call webhook: asked just before the agent answers, it gets
    back whether the business is open right now, computed here from its opening
    hours and timezone, as dynamic variables for the agent's prompt:
      {"call_inbound": {"dynamic_variables": {"is_open_now": "yes"|"no", "open_status": "..."}}}
    Retell allows ~10 seconds, so this does one or two quick lookups. Whatever goes
    wrong, the answer is an empty dynamic_variables object: a call is never blocked
    or rejected because of this.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-retell-signature")
    if not verify_retell_signature(raw_body, signature, get_settings().retell_api_key):
        print("[retell-inbound] rejected: invalid or missing x-retell-signature")
        raise HTTPException(status_code=401, detail="invalid signature")

    empty = {"call_inbound": {"dynamic_variables": {}}}
    try:
        payload = json.loads(raw_body)
        # Retell nests this event's data under "call_inbound" (not "call")
        inbound = payload.get("call_inbound") or {}
        supabase = get_supabase_admin()
        business = find_business(supabase, inbound)
        if not business:
            return empty
        tz = resolve_timezone(business_timezone(supabase, business["id"]), business.get("country"))
        if tz is None:
            return empty
        is_open, status = open_status(business.get("opening_hours"), tz)
        return {"call_inbound": {"dynamic_variables": {"is_open_now": "yes" if is_open else "no", "open_status": status}}}
    except Exception as e:  # noqa: BLE001 - never block a call
        print(f"[retell-inbound] failed, answering with no variables: {e}")
        return empty


@router.post("/webhooks/retell")
@limiter.limit("120/minute")
async def retell_webhook(request: Request, background_tasks: BackgroundTasks):
    """Retell's call webhook. call_ended stores the call FIRST (a minimal row, see
    services/call_ingest.py) and answers at once; the extraction, booking and
    owner email finish in the background on the same row. A retried or replayed
    call_ended finds the stored row and does nothing."""
    raw_body = await request.body()
    signature = request.headers.get("x-retell-signature")
    settings = get_settings()

    if not verify_retell_signature(raw_body, signature, settings.retell_api_key):
        print("[webhook] rejected: invalid or missing x-retell-signature")
        raise HTTPException(status_code=401, detail="invalid signature")

    try:
        payload = json.loads(raw_body)
        event = payload.get("event")
        call_data = payload.get("call") or {}
        if not isinstance(call_data, dict):
            raise ValueError("call is not an object")
    except (ValueError, AttributeError) as e:
        # signed but unreadable: retrying the same bytes cannot help, so acknowledge it
        print(f"[webhook] malformed payload ignored: {e}")
        return {"status": "ignored", "reason": "malformed_payload"}

    if event == "call_analyzed":
        return {"status": await call_ingest.apply_sentiment(get_supabase_admin(), call_data), "event": event}

    # We only care about the moment a call ends
    if event != "call_ended":
        return {"status": "ignored", "event": event}

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

    transcript = call_data.get("transcript") or ""
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

    # Store the call before anything slow. If this raises, the 5xx makes Retell
    # retry the whole delivery, and nothing has been lost.
    call_id, created = call_ingest.store_stub(supabase, business, call_data, transcript)
    if not created:
        return {"status": "duplicate", "call_id": call_id}

    # Extraction, booking and the owner email run after the response is sent.
    background_tasks.add_task(call_ingest.complete_call, supabase, business, call_id, call_data, transcript)
    return {"status": "accepted", "call_id": call_id}
