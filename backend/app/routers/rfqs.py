from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.rfq import RFQCreate, RFQListItem, RFQDetailResponse
from app.services import rfq_service

router = APIRouter(prefix="/api/v1/rfqs", tags=["RFQs"])

@router.post("", response_model=RFQDetailResponse, status_code=status.HTTP_201_CREATED)
def create_rfq_endpoint(payload: RFQCreate, db: Session = Depends(get_db)):
    """
    Creates a new RFQ with British Auction configuration.
    """
    try:
        rfq = rfq_service.create_rfq(payload, db)
        detail = rfq_service.get_rfq_by_id(rfq.id, db)
        return detail
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        if "UNIQUE constraint failed" in str(e) or "Duplicate entry" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An RFQ with reference ID '{payload.reference_id}' already exists."
            )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("", response_model=List[RFQListItem])
def list_rfqs_endpoint(db: Session = Depends(get_db)):
    """
    Lists all RFQs with current status, lowest bid, and closing deadlines.
    """
    return rfq_service.list_rfqs(db)

@router.get("/{rfq_id}", response_model=RFQDetailResponse)
def get_rfq_endpoint(rfq_id: int, db: Session = Depends(get_db)):
    """
    Retrieves full details for an RFQ, including quotes and activity logs.
    """
    rfq = rfq_service.get_rfq_by_id(rfq_id, db)
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RFQ with ID {rfq_id} was not found."
        )
    return rfq
