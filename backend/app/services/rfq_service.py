import random
import re
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.rfq import RFQ, AuctionConfig
from app.models.quote import Quote
from app.models.activity_log import AuctionActivityLog
from app.schemas.rfq import RFQCreate, RFQListItem, RFQDetailResponse
from app.services.auction_service import sync_rfq_status

def to_naive_utc(dt: datetime) -> datetime:
    if dt is not None and dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def clean_location_code(location: str) -> str:
    """
    Extracts a clean 3-letter uppercase code from a location name.
    e.g. 'Chennai Port (INMAA)' -> 'MAA'
    e.g. 'Mormugao, Goa' -> 'GOA'
    """
    if not location:
        return "LOC"
    # Check for 3-letter airport or port code in parentheses, e.g. (INMAA) -> MAA
    match = re.search(r'\(([A-Za-z]{3,5})\)', location)
    if match:
        code = match.group(1).upper()
        return code[-3:] if len(code) >= 3 else code
    
    alpha_only = re.sub(r'[^A-Za-z]', '', location).upper()
    return alpha_only[:3] if len(alpha_only) >= 3 else (alpha_only + "XXX")[:3]

def generate_reference_id(origin: str, destination: str, db: Session) -> str:
    """
    Generates a unique standardized reference ID in the format:
    RFQ-YYYY-ORG-DST-XXXX (e.g. RFQ-2026-CHN-GOA-4821)
    """
    year = datetime.utcnow().year
    org_code = clean_location_code(origin)
    dst_code = clean_location_code(destination)

    for _ in range(50):
        rand_num = random.randint(1000, 9999)
        ref_id = f"RFQ-{year}-{org_code}-{dst_code}-{rand_num}"
        exists = db.query(RFQ.id).filter(RFQ.reference_id == ref_id).first()
        if not exists:
            return ref_id
    
    return f"RFQ-{year}-{org_code}-{dst_code}-{int(datetime.utcnow().timestamp()) % 100000}"

def create_rfq(data: RFQCreate, db: Session) -> RFQ:
    """
    Creates an RFQ along with its British Auction configuration.
    Initializes current_bid_close_time to original_bid_close_time.
    Auto-generates reference_id if omitted.
    """
    now = datetime.utcnow()
    bid_start = to_naive_utc(data.bid_start_time)
    bid_close = to_naive_utc(data.original_bid_close_time)
    forced_close = to_naive_utc(data.forced_bid_close_time)
    pickup = to_naive_utc(data.pickup_date)

    initial_status = "SCHEDULED" if now < bid_start else "ACTIVE"

    ref_id = (
        data.reference_id.strip()
        if data.reference_id and data.reference_id.strip()
        else generate_reference_id(data.origin, data.destination, db)
    )

    rfq = RFQ(
        reference_id=ref_id,
        title=data.title,
        origin=data.origin,
        destination=data.destination,
        pickup_date=pickup,
        bid_start_time=bid_start,
        original_bid_close_time=bid_close,
        current_bid_close_time=bid_close,
        forced_bid_close_time=forced_close,
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
    Returns all RFQs with up-to-date statuses, lowest bids, and unique quotes count.
    """
    rfqs = db.query(RFQ).order_by(RFQ.created_at.desc()).all()
    results = []

    for rfq in rfqs:
        sync_rfq_status(rfq, db)

        # Get lowest bid (L1)
        l1_quote = db.query(Quote).filter(
            Quote.rfq_id == rfq.id
        ).order_by(Quote.total_price.asc()).first()

        # Count unique carriers
        unique_carriers_count = db.query(
            func.count(func.distinct(func.lower(Quote.carrier_name)))
        ).filter(Quote.rfq_id == rfq.id).scalar() or 0

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
            "total_quotes_count": unique_carriers_count,
            "config": rfq.config,
            "created_at": rfq.created_at,
            "updated_at": rfq.updated_at
        })

    return results


def get_rfq_by_id(rfq_id: int, db: Session) -> Optional[dict]:
    """
    Retrieves full details for a single RFQ, including active quotes and activity logs.
    Ensures each carrier has only their active best (lowest) quote on the leaderboard.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        return None

    sync_rfq_status(rfq, db)

    # Fetch all quotes sorted by price ascending
    all_quotes = db.query(Quote).filter(
        Quote.rfq_id == rfq.id
    ).order_by(Quote.total_price.asc(), Quote.submitted_at.asc()).all()

    # Deduplicate quotes: keep only the lowest quote per carrier
    unique_quotes = []
    seen_carriers = set()
    stale_quotes_to_delete = []

    for q in all_quotes:
        key = q.carrier_name.strip().lower()
        if key not in seen_carriers:
            seen_carriers.add(key)
            unique_quotes.append(q)
        else:
            stale_quotes_to_delete.append(q)

    # Clean up stale legacy duplicates from database
    if stale_quotes_to_delete:
        for stale in stale_quotes_to_delete:
            db.delete(stale)
        db.commit()

    # Re-assign calculated ranks 1, 2, ...
    for idx, q in enumerate(unique_quotes):
        q.calculated_rank = idx + 1

    l1_quote = unique_quotes[0] if unique_quotes else None

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
        "total_quotes_count": len(unique_quotes),
        "config": rfq.config,
        "quotes": unique_quotes,
        "activity_logs": rfq.activity_logs,
        "created_at": rfq.created_at,
        "updated_at": rfq.updated_at
    }
