from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.rfq import RFQ, AuctionConfig
from app.models.quote import Quote
from app.models.activity_log import AuctionActivityLog
from app.schemas.rfq import RFQCreate, RFQListItem, RFQDetailResponse
from app.services.auction_service import sync_rfq_status

def create_rfq(data: RFQCreate, db: Session) -> RFQ:
    """
    Creates an RFQ along with its British Auction configuration.
    Initializes current_bid_close_time to original_bid_close_time.
    """
    now = datetime.utcnow()
    initial_status = "SCHEDULED" if now < data.bid_start_time else "ACTIVE"

    rfq = RFQ(
        reference_id=data.reference_id,
        title=data.title,
        origin=data.origin,
        destination=data.destination,
        pickup_date=data.pickup_date,
        bid_start_time=data.bid_start_time,
        original_bid_close_time=data.original_bid_close_time,
        current_bid_close_time=data.original_bid_close_time,
        forced_bid_close_time=data.forced_bid_close_time,
        status=initial_status,
        extension_count=0
    )
    db.add(rfq)
    db.flush()

    config_data = data.config
    cfg = AuctionConfig(
        rfq_id=rfq.id,
        is_british_auction=config_data.is_british_auction if config_data else True,
        trigger_window_minutes=config_data.trigger_window_minutes if config_data else 10,
        extension_duration_minutes=config_data.extension_duration_minutes if config_data else 5,
        trigger_mode=config_data.trigger_mode if config_data else "L1_RANK_CHANGE"
    )
    db.add(cfg)

    # Initial system log
    initial_log = AuctionActivityLog(
        rfq_id=rfq.id,
        event_type="RFQ_CREATED",
        message=(
            f"RFQ created. British Auction enabled: {cfg.is_british_auction}. "
            f"Trigger Window: {cfg.trigger_window_minutes}m, "
            f"Extension: +{cfg.extension_duration_minutes}m, "
            f"Trigger Mode: {cfg.trigger_mode}. "
            f"Forced Close: {rfq.forced_bid_close_time.strftime('%Y-%m-%d %H:%M:%S UTC')}."
        ),
        previous_close_time=rfq.original_bid_close_time,
        new_close_time=rfq.original_bid_close_time,
        metadata_payload={"reference_id": rfq.reference_id}
    )
    db.add(initial_log)

    db.commit()
    db.refresh(rfq)
    return rfq


def list_rfqs(db: Session) -> List[dict]:
    """
    Returns all RFQs with up-to-date statuses, lowest bids, and quotes count.
    """
    rfqs = db.query(RFQ).order_by(RFQ.created_at.desc()).all()
    results = []

    for rfq in rfqs:
        sync_rfq_status(rfq, db)

        # Get lowest bid (L1)
        l1_quote = db.query(Quote).filter(
            Quote.rfq_id == rfq.id
        ).order_by(Quote.total_price.asc()).first()

        quotes_count = db.query(func.count(Quote.id)).filter(
            Quote.rfq_id == rfq.id
        ).scalar() or 0

        results.append({
            "id": rfq.id,
            "reference_id": rfq.reference_id,
            "title": rfq.title,
            "origin": rfq.origin,
            "destination": rfq.destination,
            "pickup_date": rfq.pickup_date,
            "bid_start_time": rfq.bid_start_time,
            "original_bid_close_time": rfq.original_bid_close_time,
            "current_bid_close_time": rfq.current_bid_close_time,
            "forced_bid_close_time": rfq.forced_bid_close_time,
            "status": rfq.status,
            "extension_count": rfq.extension_count,
            "lowest_bid": float(l1_quote.total_price) if l1_quote else None,
            "lowest_bidder": l1_quote.carrier_name if l1_quote else None,
            "total_quotes_count": quotes_count,
            "config": rfq.config,
            "created_at": rfq.created_at,
            "updated_at": rfq.updated_at
        })

    return results


def get_rfq_by_id(rfq_id: int, db: Session) -> Optional[dict]:
    """
    Retrieves full details for a single RFQ, including quotes and activity logs.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        return None

    sync_rfq_status(rfq, db)

    l1_quote = db.query(Quote).filter(
        Quote.rfq_id == rfq.id
    ).order_by(Quote.total_price.asc()).first()

    quotes_count = len(rfq.quotes)

    return {
        "id": rfq.id,
        "reference_id": rfq.reference_id,
        "title": rfq.title,
        "origin": rfq.origin,
        "destination": rfq.destination,
        "pickup_date": rfq.pickup_date,
        "bid_start_time": rfq.bid_start_time,
        "original_bid_close_time": rfq.original_bid_close_time,
        "current_bid_close_time": rfq.current_bid_close_time,
        "forced_bid_close_time": rfq.forced_bid_close_time,
        "status": rfq.status,
        "extension_count": rfq.extension_count,
        "lowest_bid": float(l1_quote.total_price) if l1_quote else None,
        "lowest_bidder": l1_quote.carrier_name if l1_quote else None,
        "total_quotes_count": quotes_count,
        "config": rfq.config,
        "quotes": rfq.quotes,
        "activity_logs": rfq.activity_logs,
        "created_at": rfq.created_at,
        "updated_at": rfq.updated_at
    }
