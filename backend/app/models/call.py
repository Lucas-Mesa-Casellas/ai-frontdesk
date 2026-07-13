from typing import Optional
from pydantic import BaseModel


class ExtractedCallData(BaseModel):
    caller_name: Optional[str] = None
    caller_phone: Optional[str] = None
    intent: Optional[str] = None
    summary: Optional[str] = None
    urgency: Optional[str] = None
    preferred_time: Optional[str] = None
    next_action: Optional[str] = None
    booking_type: Optional[str] = None
    party_size: Optional[int] = None
    extraction_complete: bool = False
    extraction_confidence: float = 0.0
    missing_fields: list[str] = []
    notes: Optional[str] = None