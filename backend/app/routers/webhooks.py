from fastapi import APIRouter, Request
from datetime import datetime, timezone

from app.services.ai import extract_call_data
from app.db.supabase_client import get_supabase_admin

router = APIRouter()


@router.post("/webhooks/retell")
async def retell_webhook(request: Request):
    payload = await request.json()

    event = payload.get("event")

    # We only care about the moment a call ends
    if event != "call_ended":
        return {"status": "ignored", "event": event}

    call_data = payload.get("call", {})
    transcript = call_data.get("transcript", "")

    if not transcript:
        return {"status": "no_transcript"}

    supabase = get_supabase_admin()

    # For now: hardcode to Maison Lumière while we test the pipeline
    biz = supabase.table("businesses").select("id, name").eq(
        "name", "Bella Hair Salon"
    ).limit(1).execute()

    if not biz.data:
        return {"status": "error", "detail": "business not found"}

    business = biz.data[0]

    # Run the extraction engine we already built and tested
    extracted, raw_payload = extract_call_data(transcript)

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
        "next_action": extracted.next_action,
        "booking_type": extracted.booking_type,
        "party_size": extracted.party_size,
        "extraction_complete": extracted.extraction_complete,
        "extraction_confidence": float(extracted.extraction_confidence),
        "missing_fields": extracted.missing_fields,
        "notes": extracted.notes,
        "raw_payload": raw_payload,
        "ai_extracted_at": now,
        "status": "reservation_requested" if extracted.extraction_complete else "needs_review",
    }

    result = supabase.table("calls").insert(call_record).execute()

    return {"status": "success", "call_id": result.data[0]["id"]}