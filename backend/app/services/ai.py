import json
from datetime import datetime, timedelta
from openai import OpenAI
from app.config import get_settings
from app.models.call import ExtractedCallData

settings = get_settings()
client = OpenAI(api_key=settings.openai_api_key)

LANGUAGE_NAMES = {"es": "Spanish", "fr": "French", "en": "English"}

_WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]  # datetime.weekday() order


def _resolve_requested_weekday(call_started_at: str, requested_weekday: str | None, preferred_time_iso: str | None) -> str | None:
    """Same class of error as the Layer 1 day-of-week bug already fixed for
    what the agent SPEAKS during the call (per the Agents Paper), just at a
    different spot: here the model is resolving a spoken weekday into an
    actual calendar date during post-call extraction, and gets it wrong the
    same way. requested_weekday is pure extraction (did they say "Wednesday"?
    no arithmetic involved), so recompute the DATE deterministically from
    call_started_at and keep only the model's time-of-day.
    """
    if not requested_weekday or not preferred_time_iso:
        return preferred_time_iso
    try:
        call_started = datetime.fromisoformat(call_started_at)
        model_dt = datetime.fromisoformat(preferred_time_iso)
    except ValueError:
        return preferred_time_iso
    target_weekday = _WEEKDAY_KEYS.index(requested_weekday)
    days_ahead = (target_weekday - call_started.weekday()) % 7
    if days_ahead == 0:
        # A caller naming a weekday other than "today" means the NEXT
        # occurrence of it, a week out -- not the day of the call itself.
        days_ahead = 7
    target_date = call_started.date() + timedelta(days=days_ahead)
    return model_dt.replace(year=target_date.year, month=target_date.month, day=target_date.day).isoformat()


def build_system_prompt(language: str) -> str:
    # Falls back to Spanish (matches businesses.language's own DB default)
    # for any value that isn't one of the three the dashboard supports.
    language_name = LANGUAGE_NAMES.get(language, "Spanish")
    return f"""
You are an AI assistant for a business receptionist platform serving trades
(plumbers, electricians, locksmiths, and similar) and property/rental
management businesses. Extract structured information from the call
transcript below.

Return ONLY a valid JSON object. No explanation. No markdown. No code fences.

This business communicates with its customers in {language_name}. Write
summary, next_action, and notes directly in {language_name} -- not
English, regardless of what language the transcript itself is in --
since a human business owner reads these, not this system. Do NOT
translate caller_name or preferred_time; keep those exactly as heard.
intent, urgency, and booking_type below MUST stay the exact English
values listed for each -- those are read by code, never shown as raw
text to a person. caller_phone has its own, separate rule below --
it is never free text to preserve verbatim.

Fields to extract:
- caller_name: the caller's actual name, or null if they never gave one.
  The transcript below labels each line with who's speaking ("Agent:",
  "User:") -- those labels are transcript formatting, NEVER the caller's
  name. If the caller was never asked their name or never gave one, that's
  null, not the speaker label.
- caller_phone: the literal digits the caller stated, or null if they
  never actually spoke a number. If the caller says something like
  "use this number" / "use the number I'm calling from" / "puedes usar
  este número" without reciting digits, that means null -- the system
  falls back to the verified caller ID in that case. NEVER put a
  description or phrase here (e.g. "this number", "same number as
  before"), and NEVER write the word "null" as text -- this field is
  either real digits or an actual JSON null, nothing else.
- intent: "book_appointment" | "callback" | "inquiry" | "other" | null
  (book_appointment = caller wants a job, visit, or appointment scheduled;
   callback = caller wants someone to call them back;
   inquiry = caller has a question and is not requesting action;
   other = anything else)
- summary: one sentence summary, written in {language_name}, or null
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
  or the request isn't a bookable appointment. Still fill in your best guess
  at the date even when requested_weekday (below) is set -- the system
  recomputes the date from requested_weekday itself and only keeps this
  field's time-of-day in that case, so getting the date wrong here is fine,
  but leave the correct time-of-day here.
- requested_weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" |
  null -- set this ONLY when the caller explicitly named a day of the week
  (e.g. "Wednesday", "miércoles", "mercredi", "next Tuesday"). Leave it null
  for "tomorrow", "next month", "the 23rd", or any other phrasing that isn't
  a specific weekday name -- this field exists because figuring out which
  actual calendar date a named weekday falls on is arithmetic you get wrong,
  so leave that step to the system; just report which day they said.
- next_action: what the business should do next, written in {language_name}, or null
- booking_type: "appointment" | "callback" | null
- party_size: integer or null (only if the caller mentions a number of
  people; leave null for almost all trades and property calls)
- extraction_complete: true if all critical info was captured, false otherwise
- extraction_confidence: float 0.0 to 1.0
- missing_fields: list of field names not mentioned in the transcript
- notes: any extra relevant detail, written in {language_name}, or null
"""


def extract_call_data(
    transcript: str, call_started_at: str, business_language: str = "es"
) -> tuple[ExtractedCallData, dict]:
    """
    Never raises. A single malformed AI response, OpenAI API hiccup, or
    model output straying outside the allowed field values (now enforced
    via Literal types) must never mean the whole call is silently lost —
    on any failure here we fall back to an empty, "needs_review"
    extraction rather than letting an exception propagate up through the
    webhook and drop the call entirely.

    business_language is the business's own dashboard language
    (businesses.language -- see supabase/migrations/005_business_language.sql),
    threaded through so summary/next_action/notes come back written in the
    language the business owner actually reads, not always English.
    intent/urgency/booking_type are unaffected by this -- those stay fixed
    English enum values consumed by code and translated for display via
    frontend/lib/dash-i18n.ts, never natural language.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": build_system_prompt(business_language)},
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
        extracted.preferred_time_iso = _resolve_requested_weekday(
            call_started_at, extracted.requested_weekday, extracted.preferred_time_iso
        )
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
