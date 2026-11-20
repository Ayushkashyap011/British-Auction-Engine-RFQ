from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class QuoteCreate(BaseModel):
    carrier_name: str = Field(..., min_length=2, max_length=150)
    freight_charges: float = Field(..., ge=0, description="Base freight charges")
    origin_charges: float = Field(..., ge=0, description="Origin charges")
    destination_charges: float = Field(..., ge=0, description="Destination charges")
    transit_time: str = Field(..., min_length=1, max_length=100)
    validity_date: datetime

class QuoteResponse(BaseModel):
    id: int
    rfq_id: int
    carrier_name: str
    freight_charges: float
    origin_charges: float
    destination_charges: float
    total_price: float
    transit_time: str
    validity_date: datetime
    calculated_rank: int
    submitted_at: datetime

    class Config:
        from_attributes = True

class QuoteSubmissionResult(BaseModel):
    quote: QuoteResponse
    auction_extended: bool
    extension_reason: Optional[str] = None
    new_close_time: Optional[datetime] = None
    previous_close_time: Optional[datetime] = None
