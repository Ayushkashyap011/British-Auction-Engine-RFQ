from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator, field_validator
from app.schemas.quote import QuoteResponse
from app.schemas.activity_log import ActivityLogResponse

def to_naive_utc(dt: datetime) -> datetime:
    if dt is not None and dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

class AuctionConfigBase(BaseModel):
    is_british_auction: bool = True
    trigger_window_minutes: int = Field(default=10, ge=1, description="Trigger window X in minutes")
    extension_duration_minutes: int = Field(default=5, ge=1, description="Extension duration Y in minutes")
    trigger_mode: str = Field(
        default="L1_RANK_CHANGE",
        description="Trigger mode: ANY_BID, ANY_RANK_CHANGE, L1_RANK_CHANGE"
    )

class AuctionConfigCreate(AuctionConfigBase):
    pass

class AuctionConfigResponse(AuctionConfigBase):
    id: int
    rfq_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RFQBase(BaseModel):
    reference_id: Optional[str] = Field(default=None, max_length=100, description="Optional custom reference ID; auto-generated if omitted")
    title: str = Field(..., min_length=3, max_length=255)
    origin: str = Field(..., min_length=2, max_length=150)
    destination: str = Field(..., min_length=2, max_length=150)
    pickup_date: datetime
    bid_start_time: datetime
    original_bid_close_time: datetime
    forced_bid_close_time: datetime

    @field_validator("pickup_date", "bid_start_time", "original_bid_close_time", "forced_bid_close_time", mode="after")
    @classmethod
    def strip_timezone(cls, v: datetime) -> datetime:
        return to_naive_utc(v)

class RFQCreate(RFQBase):
    config: Optional[AuctionConfigCreate] = None

    @model_validator(mode="after")
    def validate_time_rules(self):
        start = to_naive_utc(self.bid_start_time)
        close = to_naive_utc(self.original_bid_close_time)
        forced = to_naive_utc(self.forced_bid_close_time)

        self.bid_start_time = start
        self.original_bid_close_time = close
        self.forced_bid_close_time = forced

        if start >= close:
            raise ValueError("Bid Close Time must be strictly later than Bid Start Time.")
        if close >= forced:
            raise ValueError("Forced Bid Close Time must be strictly later than Bid Close Time.")
        return self

class RFQListItem(BaseModel):
    id: int
    reference_id: str
    title: str
    origin: str
    destination: str
    pickup_date: datetime
    bid_start_time: datetime
    original_bid_close_time: datetime
    current_bid_close_time: datetime
    forced_bid_close_time: datetime
    status: str
    extension_count: int
    lowest_bid: Optional[float] = None
    lowest_bidder: Optional[str] = None
    total_quotes_count: int = 0
    config: Optional[AuctionConfigResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RFQDetailResponse(RFQListItem):
    quotes: List[QuoteResponse] = []
    activity_logs: List[ActivityLogResponse] = []

    class Config:
        from_attributes = True
