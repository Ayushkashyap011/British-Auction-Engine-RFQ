from datetime import datetime, timedelta
from typing import Tuple, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.rfq import RFQ, AuctionConfig
from app.models.quote import Quote
from app.models.activity_log import AuctionActivityLog

def sync_rfq_status(rfq: RFQ, db: Session) -> str:
    """
    Evaluates and synchronizes the auction status based on current UTC time,
    bid start time, current close time, and forced close time.
    """
    now = datetime.utcnow()
    initial_status = rfq.status

    if now < rfq.bid_start_time:
        rfq.status = "SCHEDULED"
    elif now >= rfq.forced_bid_close_time:
        rfq.status = "FORCE_CLOSED"
    elif now >= rfq.current_bid_close_time:
        if rfq.current_bid_close_time >= rfq.forced_bid_close_time:
            rfq.status = "FORCE_CLOSED"
        else:
            rfq.status = "CLOSED"
    else:
        if rfq.extension_count > 0:
            rfq.status = "EXTENDED"
        else:
            rfq.status = "ACTIVE"

    if initial_status != rfq.status:
        # Log auction lifecycle transition
        if rfq.status in ["CLOSED", "FORCE_CLOSED"]:
            event = "AUCTION_FORCE_CLOSED" if rfq.status == "FORCE_CLOSED" else "AUCTION_CLOSED"
            msg = f"Auction automatically {rfq.status.lower()} as deadline was reached."
            log = AuctionActivityLog(
                rfq_id=rfq.id,
                event_type=event,
                message=msg,
                previous_close_time=rfq.current_bid_close_time,
                new_close_time=rfq.current_bid_close_time,
                metadata_payload={"status": rfq.status}
            )
            db.add(log)
        db.commit()
        db.refresh(rfq)

    return rfq.status


def recalculate_ranks(rfq_id: int, db: Session) -> List[Quote]:
    """
    Recalculates reverse ranking (L1, L2, L3...) for all quotes of an RFQ.
    Lower price = better rank (1 = L1). Ties broken by submitted_at ASC.
    """
    quotes = db.query(Quote).filter(Quote.rfq_id == rfq_id).order_by(
        Quote.total_price.asc(),
        Quote.submitted_at.asc()
    ).all()

    for idx, q in enumerate(quotes):
        q.calculated_rank = idx + 1
    
    db.flush()
    return quotes


def get_current_rankings_snapshot(rfq_id: int, db: Session) -> Dict[str, Any]:
    """
    Takes a snapshot of existing supplier rankings and the current L1 quote.
    """
    existing_quotes = db.query(Quote).filter(Quote.rfq_id == rfq_id).order_by(
        Quote.total_price.asc(),
        Quote.submitted_at.asc()
    ).all()

    l1_quote = existing_quotes[0] if existing_quotes else None
    
    # Map each carrier to their best rank prior to new submission
    carrier_ranks = {}
    for q in existing_quotes:
        if q.carrier_name not in carrier_ranks or q.calculated_rank < carrier_ranks[q.carrier_name]:
            carrier_ranks[q.carrier_name] = q.calculated_rank

    return {
        "l1_quote_id": l1_quote.id if l1_quote else None,
        "l1_carrier": l1_quote.carrier_name if l1_quote else None,
        "l1_price": float(l1_quote.total_price) if l1_quote else None,
        "carrier_ranks": carrier_ranks,
        "total_quotes": len(existing_quotes)
    }


def evaluate_bid_and_extension(
    rfq: RFQ,
    new_quote: Quote,
    pre_snapshot: Dict[str, Any],
    db: Session
) -> Tuple[bool, Optional[str], Optional[datetime], Optional[datetime]]:
    """
    Core British Auction Evaluator:
    1. Checks if bid occurred within trigger window (X minutes before current close).
    2. Evaluates the configured trigger mode:
       - ANY_BID: Any new bid in trigger window triggers extension.
       - ANY_RANK_CHANGE: Any rank shift across suppliers triggers extension.
       - L1_RANK_CHANGE: Only an L1 unseating triggers extension.
    3. Clamps extension to forced_bid_close_time.
    """
    config: Optional[AuctionConfig] = rfq.config
    submission_time = new_quote.submitted_at or datetime.utcnow()
    prev_close = rfq.current_bid_close_time

    # If British Auction is disabled, simply log bid
    if not config or not config.is_british_auction:
        log = AuctionActivityLog(
            rfq_id=rfq.id,
            event_type="BID_SUBMITTED",
            message=f"Bid submitted by {new_quote.carrier_name} for ${float(new_quote.total_price):,.2f}.",
            previous_close_time=prev_close,
            new_close_time=prev_close,
            metadata_payload={"carrier": new_quote.carrier_name, "price": float(new_quote.total_price)}
        )
        db.add(log)
        db.commit()
        return False, None, None, prev_close

    trigger_window = timedelta(minutes=config.trigger_window_minutes)
    window_start = prev_close - trigger_window

    is_in_trigger_window = window_start <= submission_time <= prev_close

    # If bid is placed before the trigger window
    if not is_in_trigger_window:
        log = AuctionActivityLog(
            rfq_id=rfq.id,
            event_type="BID_SUBMITTED",
            message=f"Bid submitted by {new_quote.carrier_name} for ${float(new_quote.total_price):,.2f} at rank L{new_quote.calculated_rank} (outside trigger window).",
            previous_close_time=prev_close,
            new_close_time=prev_close,
            metadata_payload={
                "carrier": new_quote.carrier_name,
                "price": float(new_quote.total_price),
                "rank": new_quote.calculated_rank
            }
        )
        db.add(log)
        db.commit()
        return False, None, None, prev_close

    # Bid IS within the trigger window. Now test the configured Trigger Mode
    trigger_mode = config.trigger_mode or "L1_RANK_CHANGE"
    triggered = False
    trigger_reason = ""

    if trigger_mode == "ANY_BID":
        triggered = True
        trigger_reason = (
            f"New bid placed by {new_quote.carrier_name} (${float(new_quote.total_price):,.2f}) "
            f"within last {config.trigger_window_minutes} minutes."
        )

    elif trigger_mode == "ANY_RANK_CHANGE":
        # Check if ranking changed
        carrier = new_quote.carrier_name
        old_rank = pre_snapshot["carrier_ranks"].get(carrier)
        new_rank = new_quote.calculated_rank

        # Ranking changes if:
        # a) this is a new carrier entering at rank <= existing count, or
        # b) existing carrier improved their rank (new_rank < old_rank)
        # c) a new quote shifted other existing ranks down
        if pre_snapshot["total_quotes"] == 0:
            triggered = True
            trigger_reason = f"Initial bid established rank L1 by {carrier} (${float(new_quote.total_price):,.2f}) in trigger window."
        elif old_rank is None or new_rank < old_rank or new_rank <= pre_snapshot["total_quotes"]:
            triggered = True
            trigger_reason = (
                f"Supplier ranking changed following new bid from {carrier} "
                f"(${float(new_quote.total_price):,.2f}) securing rank L{new_rank}."
            )
        else:
            triggered = False

    elif trigger_mode == "L1_RANK_CHANGE":
        # Check if new quote took L1 position (lowest price overall)
        if new_quote.calculated_rank == 1:
            prev_l1_carrier = pre_snapshot.get("l1_carrier")
            prev_l1_price = pre_snapshot.get("l1_price")

            if prev_l1_carrier is None:
                triggered = True
                trigger_reason = f"First bid placed: {new_quote.carrier_name} established L1 at ${float(new_quote.total_price):,.2f}."
            else:
                triggered = True
                trigger_reason = (
                    f"New lowest bidder (L1) established by {new_quote.carrier_name} "
                    f"(${float(new_quote.total_price):,.2f}), beating previous L1 "
                    f"{prev_l1_carrier} (${prev_l1_price:,.2f})."
                )
        else:
            triggered = False

    # If trigger condition was not met in this mode
    if not triggered:
        log = AuctionActivityLog(
            rfq_id=rfq.id,
            event_type="BID_SUBMITTED",
            message=(
                f"Bid placed by {new_quote.carrier_name} for ${float(new_quote.total_price):,.2f} "
                f"at rank L{new_quote.calculated_rank} inside trigger window, "
                f"but trigger condition '{trigger_mode}' was not met."
            ),
            previous_close_time=prev_close,
            new_close_time=prev_close,
            metadata_payload={
                "carrier": new_quote.carrier_name,
                "price": float(new_quote.total_price),
                "rank": new_quote.calculated_rank,
                "trigger_mode": trigger_mode
            }
        )
        db.add(log)
        db.commit()
        return False, None, None, prev_close

    # Trigger condition satisfied -> Calculate extension with forced ceiling clamping
    extension_delta = timedelta(minutes=config.extension_duration_minutes)
    tentative_close = prev_close + extension_delta

    # Rule: Auction extensions must NEVER exceed Forced Bid Close Time
    if tentative_close <= rfq.forced_bid_close_time:
        new_close = tentative_close
        rfq.current_bid_close_time = new_close
        rfq.extension_count += 1
        rfq.status = "EXTENDED"

        log = AuctionActivityLog(
            rfq_id=rfq.id,
            event_type="AUCTION_EXTENDED",
            message=f"Auction extended by {config.extension_duration_minutes} mins to {new_close.strftime('%H:%M:%S UTC')}. Reason: {trigger_reason}",
            previous_close_time=prev_close,
            new_close_time=new_close,
            metadata_payload={
                "carrier": new_quote.carrier_name,
                "price": float(new_quote.total_price),
                "extension_duration_minutes": config.extension_duration_minutes,
                "reason": trigger_reason
            }
        )
        db.add(log)
        db.commit()
        return True, trigger_reason, new_close, prev_close

    else:
        # tentative_close > forced_bid_close_time
        if prev_close < rfq.forced_bid_close_time:
            # Clamp to forced close time
            new_close = rfq.forced_bid_close_time
            rfq.current_bid_close_time = new_close
            rfq.extension_count += 1
            rfq.status = "EXTENDED"

            clamp_reason = (
                f"{trigger_reason} Auction extended to Forced Bid Close Time ceiling "
                f"({rfq.forced_bid_close_time.strftime('%H:%M:%S UTC')})."
            )
            log = AuctionActivityLog(
                rfq_id=rfq.id,
                event_type="EXTENSION_CLAMPED",
                message=clamp_reason,
                previous_close_time=prev_close,
                new_close_time=new_close,
                metadata_payload={
                    "carrier": new_quote.carrier_name,
                    "price": float(new_quote.total_price),
                    "forced_bid_close_time": rfq.forced_bid_close_time.isoformat(),
                    "reason": clamp_reason
                }
            )
            db.add(log)
            db.commit()
            return True, clamp_reason, new_close, prev_close

        else:
            # Already at forced close time -> cannot extend further
            log = AuctionActivityLog(
                rfq_id=rfq.id,
                event_type="BID_SUBMITTED",
                message=(
                    f"Bid placed by {new_quote.carrier_name} (${float(new_quote.total_price):,.2f}), "
                    f"but auction is already at Forced Bid Close Time ({rfq.forced_bid_close_time.strftime('%H:%M:%S UTC')}). "
                    f"No further extensions allowed."
                ),
                previous_close_time=prev_close,
                new_close_time=prev_close,
                metadata_payload={
                    "carrier": new_quote.carrier_name,
                    "price": float(new_quote.total_price),
                    "at_forced_ceiling": True
                }
            )
            db.add(log)
            db.commit()
            return False, "Auction already at Forced Bid Close Time ceiling", prev_close, prev_close
