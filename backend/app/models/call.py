from typing import Optional, Literal
from pydantic import BaseModel, field_validator

# gpt-4o-mini occasionally writes the literal word "null" (or "none"/"n/a")
# into a JSON string field instead of an actual JSON null when nothing was
# said -- e.g. a caller_phone of "null" is truthy, so the Caller-ID fallback
# in webhooks.py would never kick in. Treat these the same as a real null,
# at the model boundary, so nothing downstream has to know this happens.
_NULLISH_STRINGS = {"null", "none", "n/a", "na", ""}

# Transcripts are formatted with English speaker labels ("Agent: ...",
# "User: ...") regardless of the call's spoken language -- when the caller
# is never actually asked their name, the model has grabbed the speaker
# label itself instead of leaving caller_name null. A few localized/synonym
# variants included defensively in case a differently-formatted transcript
# or a model hallucination introduces one.
_SPEAKER_LABELS = {"user", "agent", "caller", "utilisateur", "usuario", "assistant", "ai"}


class ExtractedCallData(BaseModel):
    caller_name: Optional[str] = None
    caller_phone: Optional[str] = None
    intent: Optional[Literal["book_appointment", "callback", "inquiry", "other"]] = None
    summary: Optional[str] = None
    urgency: Optional[Literal["low", "normal", "high"]] = None
    preferred_time: Optional[str] = None
    preferred_time_iso: Optional[str] = None
    # The exact weekday name the caller stated, e.g. "wed" for "Wednesday" /
    # "miércoles" -- filled in ONLY when they named a specific day of the
    # week (not for "tomorrow", "next month", or an absolute date). Kept
    # separate from preferred_time_iso because resolving "which calendar
    # date is that weekday" is arithmetic the model has repeatedly gotten
    # wrong; this field lets webhooks.py redo that step deterministically
    # in Python instead.
    requested_weekday: Optional[Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]] = None
    next_action: Optional[str] = None
    booking_type: Optional[Literal["appointment", "callback"]] = None
    party_size: Optional[int] = None
    extraction_complete: bool = False
    extraction_confidence: float = 0.0
    missing_fields: list[str] = []
    notes: Optional[str] = None

    @field_validator(
        "caller_name", "caller_phone", "summary", "preferred_time",
        "preferred_time_iso", "next_action", "notes",
        mode="before",
    )
    @classmethod
    def _blank_nullish_strings(cls, v):
        if isinstance(v, str) and v.strip().lower() in _NULLISH_STRINGS:
            return None
        return v

    @field_validator("caller_name", mode="before")
    @classmethod
    def _blank_speaker_labels(cls, v):
        if isinstance(v, str) and v.strip().lower() in _SPEAKER_LABELS:
            return None
        return v
