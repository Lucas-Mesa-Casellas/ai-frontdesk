import json
from datetime import datetime, timezone
from app.services.ai import extract_call_data
from app.db.supabase_client import get_supabase_admin

supabase = get_supabase_admin()

# 1. Get demo business
biz = supabase.table("businesses").select("id, name").limit(1).execute()
business = biz.data[0]
print(f"Business: {business['name']}")

# 2. Test transcript
transcript = (
    "Hello, this is Marie Dupont. I would like to book a table for 3 people "
    "this Friday at 7:30pm. My number is +33698765432. We have a nut allergy."
)

# 3. Run AI extraction
extracted, raw_payload = extract_call_data(transcript)
print(f"Extracted: {extracted.caller_name} | {extracted.intent} | complete={extracted.extraction_complete}")

# 4. Save to Supabase
now = datetime.now(timezone.utc).isoformat()

call_record = {
    "business_id": business["id"],
    "source": "test",
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
call_id = result.data[0]["id"]
print(f"Saved to Supabase. Call ID: {call_id}")

# 5. Read it back
saved = supabase.table("calls").select("*").eq("id", call_id).execute()
row = saved.data[0]
print(f"Read back: {row['caller_name']} | {row['intent']} | status={row['status']}")
print("Done — full loop working.")
