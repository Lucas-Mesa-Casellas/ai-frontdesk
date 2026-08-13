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
  high = a genuine emergency or something needing same-day action. For trades calls:
  an active leak/flood, no heat or hot water in cold conditions, no power, a gas smell,
  being locked out, a safety hazard, or anything the caller explicitly calls urgent or
  an emergency. For property management calls: a break-in or security issue, a serious
  maintenance failure at a currently-occupied property (no water/power, a leak), or
  anything the caller explicitly calls urgent.
  normal = a routine request with no time pressure (a scheduled viewing, a general
  question, an ordinary booking).
  low = nothing needs to happen soon (general feedback, a low-priority note).
  If genuinely unsure between normal and high, choose normal -- keep this narrow so
  notifications stay meaningful rather than routine.
- preferred_time: exact string the caller used, or null
- preferred_time_iso: the requested appointment start time, resolved to a full
  ISO 8601 datetime, using the SAME timezone offset shown in the call date/time
  above (e.g. "2026-08-14T17:00:00+02:00"),
  using the call date/time above as the reference point for relative phrases
  like "tomorrow" or "next Thursday". Null if no specific date/time was given
  or the request isn't a bookable appointment.
- next_action: what the business should do next, or null
- booking_type: "appointment" | "callback" | null
- party_size: integer or null (only if the caller mentions a number of
  people; leave null for almost all trades and property calls)
- extraction_complete: true if all critical info was captured, false otherwise
- extraction_confidence: float 0.0 to 1.0
- missing_fields: list of field names not mentioned in the transcript
- notes: any extra relevant detail, or null
"""


def extract_call_data(transcript: str, call_started_at: str) -> tuple[ExtractedCallData, dict]:
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
                {"role": "user", "content": f"Call date/time: {call_started_at}\n\nTranscript:\n{transcript}"},
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
