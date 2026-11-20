from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.quote import QuoteCreate, QuoteResponse, QuoteSubmissionResult
from app.services import quote_service

router = APIRouter(prefix="/api/v1/rfqs/{rfq_id}/quotes", tags=["Quotes"])

@router.post("", response_model=QuoteSubmissionResult, status_code=status.HTTP_201_CREATED)
def submit_quote_endpoint(rfq_id: int, payload: QuoteCreate, db: Session = Depends(get_db)):
    """
    Submits a quote on an active RFQ and evaluates British Auction extension triggers.
    """
    return quote_service.submit_quote(rfq_id=rfq_id, data=payload, db=db)

@router.get("", response_model=List[QuoteResponse])
def get_quotes_endpoint(rfq_id: int, db: Session = Depends(get_db)):
    """
    Retrieves all quotes for an RFQ, sorted by total price ascending (L1, L2, L3...).
    """
    return quote_service.list_quotes_for_rfq(rfq_id=rfq_id, db=db)
