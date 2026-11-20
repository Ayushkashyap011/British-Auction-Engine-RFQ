from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel

class ActivityLogResponse(BaseModel):
    id: int
    rfq_id: int
    event_type: str
    message: str
    previous_close_time: Optional[datetime] = None
    new_close_time: Optional[datetime] = None
    metadata_payload: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
