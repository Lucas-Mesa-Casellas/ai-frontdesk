import json
from openai import OpenAI
from app.config import get_settings
from app.models.call import ExtractedCallData

settings = get_settings()
client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """
You are an AI assistant for a business receptionist platform.
Extract structured information from the call transcript below.

Return ONLY a valid JSON object. No explanation. No markdown. No code fences.

Fields to extract:
- caller_name: string or null
- caller_phone: string or null
- intent: "book_reservation" | "callback" | "inquiry" | "other" | null
- summary: one sentence summary or null
- urgency: "low" | "normal" | "high" | null
- preferred_time: exact string the caller used, or null
- next_action: what the business should do next, or null
- booking_type: "reservation" | "callback" | "appointment" | "inquiry" | null
- party_size: integer or null
- extraction_complete: true if all critical info was captured, false otherwise
- extraction_confidence: float 0.0 to 1.0
- missing_fields: list of field names not mentioned in the transcript
- notes: any extra relevant detail, or null
"""


def extract_call_data(transcript: str) -> tuple[ExtractedCallData, dict]:
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