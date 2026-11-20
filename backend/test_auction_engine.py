import sys
import os
import uuid
from datetime import datetime, timedelta

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.rfq import RFQ, AuctionConfig
from app.schemas.quote import QuoteCreate
from app.services.quote_service import submit_quote

def test_auction_suite():
    db = SessionLocal()
    print("\n==========================================")
    print("RUNNING BRITISH AUCTION ENGINE TEST SUITE")
    print("==========================================")

    uid = uuid.uuid4().hex[:6].upper()
    now = datetime.utcnow()

    # ----------------------------------------------------
    # TEST 1: Mode A - ANY_BID Trigger Test
    # ----------------------------------------------------
    print("\n[TEST 1] Testing Trigger Mode: ANY_BID...")
    rfq_any = RFQ(
        reference_id=f"TEST-RFQ-ANY-{uid}",
        title="Test RFQ Any Bid Mode",
        origin="Port A",
        destination="Port B",
        pickup_date=now + timedelta(days=5),
        bid_start_time=now - timedelta(hours=1),
        original_bid_close_time=now + timedelta(minutes=4),
        current_bid_close_time=now + timedelta(minutes=4),
        forced_bid_close_time=now + timedelta(minutes=30),
        status="ACTIVE",
        extension_count=0
    )
    db.add(rfq_any)
    db.flush()

    cfg_any = AuctionConfig(
        rfq_id=rfq_any.id,
        is_british_auction=True,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        trigger_mode="ANY_BID"
    )
    db.add(cfg_any)
    db.commit()

    initial_close = rfq_any.current_bid_close_time
    quote_payload = QuoteCreate(
        carrier_name="Carrier Test",
        freight_charges=1000.0,
        origin_charges=100.0,
        destination_charges=100.0,
        transit_time="3 Days",
        validity_date=now + timedelta(days=5)
    )
    res = submit_quote(rfq_any.id, quote_payload, db)
    
    assert res.auction_extended is True, "Auction should have extended for ANY_BID mode"
    assert res.new_close_time == initial_close + timedelta(minutes=5), "Close time should be extended by 5 minutes"
    print(f"PASS: ANY_BID extended successfully from {initial_close.strftime('%H:%M:%S')} to {res.new_close_time.strftime('%H:%M:%S')}")

    # ----------------------------------------------------
    # TEST 2: Mode C - L1_RANK_CHANGE Trigger Test
    # ----------------------------------------------------
    print("\n[TEST 2] Testing Trigger Mode: L1_RANK_CHANGE...")
    rfq_l1 = RFQ(
        reference_id=f"TEST-RFQ-L1-{uid}",
        title="Test RFQ L1 Mode",
        origin="Port X",
        destination="Port Y",
        pickup_date=now + timedelta(days=5),
        bid_start_time=now - timedelta(hours=1),
        original_bid_close_time=now + timedelta(minutes=2),
        current_bid_close_time=now + timedelta(minutes=2),
        forced_bid_close_time=now + timedelta(minutes=30),
        status="ACTIVE",
        extension_count=0
    )
    db.add(rfq_l1)
    db.flush()

    cfg_l1 = AuctionConfig(
        rfq_id=rfq_l1.id,
        is_british_auction=True,
        trigger_window_minutes=10,
        extension_duration_minutes=3,
        trigger_mode="L1_RANK_CHANGE"
    )
    db.add(cfg_l1)
    db.commit()

    # Step A: Place baseline quote ($1500 total) -> establishes L1, should extend
    q1 = QuoteCreate(
        carrier_name="Carrier Alpha",
        freight_charges=1300.0,
        origin_charges=100.0,
        destination_charges=100.0,
        transit_time="4 Days",
        validity_date=now + timedelta(days=5)
    )
    res1 = submit_quote(rfq_l1.id, q1, db)
    assert res1.auction_extended is True
    print(f"PASS: First bid established L1, extended close time to {res1.new_close_time.strftime('%H:%M:%S')}.")

    # Step B: Place higher quote ($2000 total) -> rank L2, L1 does NOT change -> should NOT extend
    close_before_q2 = rfq_l1.current_bid_close_time
    q2 = QuoteCreate(
        carrier_name="Carrier Beta",
        freight_charges=1800.0,
        origin_charges=100.0,
        destination_charges=100.0,
        transit_time="4 Days",
        validity_date=now + timedelta(days=5)
    )
    res2 = submit_quote(rfq_l1.id, q2, db)
    assert res2.auction_extended is False, "Higher quote should NOT extend in L1_RANK_CHANGE mode"
    assert rfq_l1.current_bid_close_time == close_before_q2, "Close time must remain unchanged"
    print("PASS: Higher quote (L2) did NOT trigger extension in L1 mode.")

    # Step C: Place lower quote ($1200 total) -> unseats L1 inside trigger window -> should extend!
    q3 = QuoteCreate(
        carrier_name="Carrier Gamma",
        freight_charges=1000.0,
        origin_charges=100.0,
        destination_charges=100.0,
        transit_time="4 Days",
        validity_date=now + timedelta(days=5)
    )
    res3 = submit_quote(rfq_l1.id, q3, db)
    assert res3.auction_extended is True, "Lower quote unseating L1 MUST trigger extension"
    assert res3.quote.calculated_rank == 1
    print(f"PASS: Lower quote unseating L1 successfully extended the auction to {res3.new_close_time.strftime('%H:%M:%S')}.")

    # ----------------------------------------------------
    # TEST 3: Mode B - ANY_RANK_CHANGE Trigger Test
    # ----------------------------------------------------
    print("\n[TEST 3] Testing Trigger Mode: ANY_RANK_CHANGE...")
    rfq_rank = RFQ(
        reference_id=f"TEST-RFQ-RANK-{uid}",
        title="Test RFQ Rank Change Mode",
        origin="Port K",
        destination="Port L",
        pickup_date=now + timedelta(days=5),
        bid_start_time=now - timedelta(hours=1),
        original_bid_close_time=now + timedelta(minutes=2),
        current_bid_close_time=now + timedelta(minutes=2),
        forced_bid_close_time=now + timedelta(minutes=30),
        status="ACTIVE",
        extension_count=0
    )
    db.add(rfq_rank)
    db.flush()

    cfg_rank = AuctionConfig(
        rfq_id=rfq_rank.id,
        is_british_auction=True,
        trigger_window_minutes=10,
        extension_duration_minutes=3,
        trigger_mode="ANY_RANK_CHANGE"
    )
    db.add(cfg_rank)
    db.commit()

    # First bid -> L1 ($1000)
    res_r1 = submit_quote(rfq_rank.id, QuoteCreate(carrier_name="Carrier 1", freight_charges=800, origin_charges=100, destination_charges=100, transit_time="1 Day", validity_date=now+timedelta(days=1)), db)
    assert res_r1.auction_extended is True

    # Second bid -> L2 ($1200) -> ranks shifted (added L2)
    res_r2 = submit_quote(rfq_rank.id, QuoteCreate(carrier_name="Carrier 2", freight_charges=1000, origin_charges=100, destination_charges=100, transit_time="1 Day", validity_date=now+timedelta(days=1)), db)
    assert res_r2.auction_extended is True

    # Third bid by Carrier 3 at $1100 -> slips between Carrier 1 and Carrier 2, taking rank L2 and pushing Carrier 2 to L3!
    res_r3 = submit_quote(rfq_rank.id, QuoteCreate(carrier_name="Carrier 3", freight_charges=900, origin_charges=100, destination_charges=100, transit_time="1 Day", validity_date=now+timedelta(days=1)), db)
    assert res_r3.auction_extended is True, "Rank shift across non-L1 carriers must trigger extension in ANY_RANK_CHANGE mode"
    print("PASS: Non-L1 rank shift (L2 push) successfully triggered extension in ANY_RANK_CHANGE mode.")

    # ----------------------------------------------------
    # TEST 4: Hard Ceiling Clamping to Forced Bid Close Time
    # ----------------------------------------------------
    print("\n[TEST 4] Testing Hard Ceiling Clamping...")
    rfq_clamp = RFQ(
        reference_id=f"TEST-RFQ-CLAMP-{uid}",
        title="Test RFQ Clamping",
        origin="Port M",
        destination="Port N",
        pickup_date=now + timedelta(days=5),
        bid_start_time=now - timedelta(hours=1),
        original_bid_close_time=now + timedelta(minutes=3),
        current_bid_close_time=now + timedelta(minutes=3),
        forced_bid_close_time=now + timedelta(minutes=5),  # Only 2 minutes after current close!
        status="ACTIVE",
        extension_count=0
    )
    db.add(rfq_clamp)
    db.flush()

    cfg_clamp = AuctionConfig(
        rfq_id=rfq_clamp.id,
        is_british_auction=True,
        trigger_window_minutes=10,
        extension_duration_minutes=10,  # Extension is 10 mins, but forced close is only +2 mins away!
        trigger_mode="ANY_BID"
    )
    db.add(cfg_clamp)
    db.commit()

    q_clamp = QuoteCreate(
        carrier_name="Carrier Delta",
        freight_charges=800.0,
        origin_charges=50.0,
        destination_charges=50.0,
        transit_time="2 Days",
        validity_date=now + timedelta(days=5)
    )
    res_clamp = submit_quote(rfq_clamp.id, q_clamp, db)
    
    assert res_clamp.auction_extended is True
    assert res_clamp.new_close_time == rfq_clamp.forced_bid_close_time, (
        f"Expected close time to be clamped exactly to forced close time {rfq_clamp.forced_bid_close_time}, "
        f"got {res_clamp.new_close_time}"
    )
    print("PASS: Auction extension correctly clamped to Forced Bid Close Time!")

    # Step D: Attempt another extension when already at forced close time
    q_ceiling = QuoteCreate(
        carrier_name="Carrier Epsilon",
        freight_charges=700.0,
        origin_charges=50.0,
        destination_charges=50.0,
        transit_time="2 Days",
        validity_date=now + timedelta(days=5)
    )
    res_ceiling = submit_quote(rfq_clamp.id, q_ceiling, db)
    assert res_ceiling.auction_extended is False, "Must not extend when already at forced close ceiling"
    print("PASS: Extension rejected when auction is already at Forced Bid Close Time.")

    print("\n==========================================")
    print("ALL 4 CORE AUCTION ENGINE TESTS PASSED!")
    print("==========================================\n")
    db.close()

if __name__ == "__main__":
    test_auction_suite()
