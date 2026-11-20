from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.rfq import RFQ
from app.models.quote import Quote
from app.schemas.quote import QuoteCreate, QuoteSubmissionResult, QuoteResponse
from app.services.auction_service import (
    sync_rfq_status,
    recalculate_ranks,
    get_current_rankings_snapshot,
    evaluate_bid_and_extension,
    to_naive_utc
)

def submit_quote(rfq_id: int, data: QuoteCreate, db: Session) -> QuoteSubmissionResult:
    """
    Submits or revises a quote for an RFQ and evaluates British Auction extension rules.
    If the carrier already submitted a quote, their existing quote is updated to the
    new lower price, ensuring each company appears exactly once on the leaderboard.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).with_for_update().first()
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RFQ with ID {rfq_id} was not found."
        )

    # Sync and verify status
    current_status = sync_rfq_status(rfq, db)
    if current_status not in ["ACTIVE", "EXTENDED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit quote: RFQ is currently {current_status}."
        )

    # Verify time window (ensure naive UTC comparison)
    now = datetime.utcnow()
    close_time = to_naive_utc(rfq.current_bid_close_time)

    if now > close_time:
        sync_rfq_status(rfq, db)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bidding has concluded for this RFQ."
        )

    # Pre-submission ranking snapshot
    pre_snapshot = get_current_rankings_snapshot(rfq.id, db)

    # Calculate total price
    total_price = round(
        float(data.freight_charges) + float(data.origin_charges) + float(data.destination_charges),
        2
    )

    normalized_carrier = data.carrier_name.strip()

    # Check if this carrier already has an active quote for this RFQ
    existing_quotes = db.query(Quote).filter(
        Quote.rfq_id == rfq.id,
        func.lower(Quote.carrier_name) == func.lower(normalized_carrier)
    ).all()

    if existing_quotes:
        # Carrier is revising an existing quote: update the primary quote and clean up any duplicates
        quote = existing_quotes[0]
        prev_price = float(quote.total_price)

        # In reverse auctions, a supplier cannot revise upwards
        if total_price >= prev_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{normalized_carrier} already has a quote of ${prev_price:,.2f}. Revisions must be strictly lower than your current quote."
            )

        quote.carrier_name = normalized_carrier
        quote.freight_charges = data.freight_charges
        quote.origin_charges = data.origin_charges
        quote.destination_charges = data.destination_charges
        quote.total_price = total_price
        quote.transit_time = data.transit_time
        quote.validity_date = to_naive_utc(data.validity_date)
        quote.submitted_at = now

        # Remove any legacy duplicate entries for this carrier if present
        for extra in existing_quotes[1:]:
            db.delete(extra)

    else:
        # First quote from this carrier
        quote = Quote(
            rfq_id=rfq.id,
            carrier_name=normalized_carrier,
            freight_charges=data.freight_charges,
            origin_charges=data.origin_charges,
            destination_charges=data.destination_charges,
            total_price=total_price,
            transit_time=data.transit_time,
            validity_date=to_naive_utc(data.validity_date),
            calculated_rank=1,
            submitted_at=now
        )
        db.add(quote)

    db.flush()

    # Recalculate ranks for all quotes in this RFQ
    recalculate_ranks(rfq.id, db)
    db.refresh(quote)

    # Evaluate British Auction extension
    extended, reason, new_close, prev_close = evaluate_bid_and_extension(
        rfq=rfq,
        new_quote=quote,
        pre_snapshot=pre_snapshot,
        db=db
    )

    return QuoteSubmissionResult(
        quote=QuoteResponse.model_validate(quote),
        auction_extended=extended,
        extension_reason=reason,
        new_close_time=new_close,
        previous_close_time=prev_close
    )


def list_quotes_for_rfq(rfq_id: int, db: Session) -> List[Quote]:
    """
    Returns unique quotes per carrier for an RFQ, sorted by total price ascending (L1, L2, L3...).
    """
    quotes = db.query(Quote).filter(Quote.rfq_id == rfq_id).order_by(
        Quote.total_price.asc(),
        Quote.submitted_at.asc()
    ).all()

    # Deduplicate by carrier name (keep lowest price)
    unique_quotes = []
    seen = set()
    for q in quotes:
        key = q.carrier_name.strip().lower()
        if key not in seen:
            seen.add(key)
            unique_quotes.append(q)

    # Ensure rank sequence 1, 2, 3...
    for idx, q in enumerate(unique_quotes):
        q.calculated_rank = idx + 1

    return unique_quotes
