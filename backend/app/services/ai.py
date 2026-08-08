import json
from openai import OpenAI
from app.config import get_settings
from app.models.call import ExtractedCallData

settings = get_settings()
client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """
You are an AI assistant for a business receptionist platform serving trades
(plumbers, electricians, locksmiths, and similar) and property/rental
management businesses. Extract structured information from the call
transcript below.

Return ONLY a valid JSON object. No explanation. No markdown. No code fences.

Fields to extract:
- caller_name: string or null
- caller_phone: string or null
- intent: "book_appointment" | "callback" | "inquiry" | "other" | null
  (book_appointment = caller wants a job, visit, or appointment scheduled;
   callback = caller wants someone to call them back;
   inquiry = caller has a question and is not requesting action;
   other = anything else)
- summary: one sentence summary or null
- urgency: "low" | "normal" | "high" | null
  (high = emergency or time-critical, e.g. leak, lockout, no heat/power)
- preferred_time: exact string the caller used, or null
- next_action: what the business should do next, or null
- booking_type: "appointment" | "callback" | null
- party_size: integer or null (only if the caller mentions a number of
  people; leave null for almost all trades and property calls)
- extraction_complete: true if all critical info was captured, false otherwise
- extraction_confidence: float 0.0 to 1.0
- missing_fields: list of field names not mentioned in the transcript
- notes: any extra relevant detail, or null
"""


def extract_call_data(transcript: str) -> tuple[ExtractedCallData, dict]:
    """
    Never raises. A single malformed AI response, OpenAI API hiccup, or
    model output straying outside the allowed field values (now enforced
    via Literal types) must never mean the whole call is silently lost —
    on any failure here we fall back to an empty, "needs_review"
    extraction rather than letting an exception propagate up through the
    webhook and drop the call entirely.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Transcript:\n{transcript}"},
            ],
            max_tokens=500,
            temperature=0,
        )
        raw_text = response.choices[0].message.content
        raw_payload = {
            "model": response.model,
            "usage": response.usage.model_dump(),
            "raw_text": raw_text,
        }
        parsed = json.loads(raw_text)
        extracted = ExtractedCallData(**parsed)
        return extracted, raw_payload

    except Exception as e:
        print(f"[extract_call_data] extraction failed, falling back to needs_review: {e}")
        fallback = ExtractedCallData(
            extraction_complete=False,
            extraction_confidence=0.0,
            notes=f"AI extraction failed ({type(e).__name__}). Full transcript is saved — please review manually.",
        )
        raw_payload = {"error": str(e), "error_type": type(e).__name__}
        return fallback, raw_payload
