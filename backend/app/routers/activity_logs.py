from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.activity_log import AuctionActivityLog
from app.schemas.activity_log import ActivityLogResponse

router = APIRouter(prefix="/api/v1/rfqs/{rfq_id}/activity-logs", tags=["Activity Logs"])

@router.get("", response_model=List[ActivityLogResponse])
def get_activity_logs_endpoint(rfq_id: int, db: Session = Depends(get_db)):
    """
    Retrieves chronological activity and extension logs for a specific RFQ.
    """
    logs = db.query(AuctionActivityLog).filter(
        AuctionActivityLog.rfq_id == rfq_id
    ).order_by(AuctionActivityLog.created_at.desc()).all()
    return logs
