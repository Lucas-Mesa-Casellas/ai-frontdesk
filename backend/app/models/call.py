from typing import Optional, Literal
from pydantic import BaseModel


class ExtractedCallData(BaseModel):
    caller_name: Optional[str] = None
    caller_phone: Optional[str] = None
    intent: Optional[Literal["book_appointment", "callback", "inquiry", "other"]] = None
    summary: Optional[str] = None
    urgency: Optional[Literal["low", "normal", "high"]] = None
    preferred_time: Optional[str] = None
    next_action: Optional[str] = None
    booking_type: Optional[Literal["appointment", "callback"]] = None
    party_size: Optional[int] = None
    extraction_complete: bool = False
    extraction_confidence: float = 0.0
    missing_fields: list[str] = []
    notes: Optional[str] = None
