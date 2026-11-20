import sys
import os
from datetime import datetime, timedelta

# Ensure parent directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.rfq import RFQ, AuctionConfig
from app.models.quote import Quote
from app.models.activity_log import AuctionActivityLog

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing = db.query(RFQ).first()
        if existing:
            print("Database already contains RFQs. Skipping seed.")
            return

        print("Seeding demo RFQs with British Auction configurations...")
        now = datetime.utcnow()

        # --- RFQ 1: Ocean Freight - L1_RANK_CHANGE Mode ---
        rfq1 = RFQ(
            reference_id="RFQ-2026-INNSA-NLRTM-01",
            title="Ocean Freight (40ft HC) - Nhava Sheva to Rotterdam",
            origin="Nhava Sheva, India (INNSA)",
            destination="Rotterdam, Netherlands (NLRTM)",
            pickup_date=now + timedelta(days=7),
            bid_start_time=now - timedelta(hours=2),
            original_bid_close_time=now + timedelta(minutes=15),
            current_bid_close_time=now + timedelta(minutes=15),
            forced_bid_close_time=now + timedelta(minutes=60),
            status="ACTIVE",
            extension_count=0
        )
        db.add(rfq1)
        db.flush()

        cfg1 = AuctionConfig(
            rfq_id=rfq1.id,
            is_british_auction=True,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_mode="L1_RANK_CHANGE"
        )
        db.add(cfg1)

        # Quotes for RFQ 1
        quotes_rfq1 = [
            Quote(
                rfq_id=rfq1.id,
                carrier_name="Maersk Line",
                freight_charges=2100.00,
                origin_charges=350.00,
                destination_charges=400.00,
                total_price=2850.00,
                transit_time="24 Days",
                validity_date=now + timedelta(days=14),
                calculated_rank=2,
                submitted_at=now - timedelta(minutes=45)
            ),
            Quote(
                rfq_id=rfq1.id,
                carrier_name="Hapag-Lloyd Logistics",
                freight_charges=1950.00,
                origin_charges=320.00,
                destination_charges=380.00,
                total_price=2650.00,
                transit_time="22 Days",
                validity_date=now + timedelta(days=14),
                calculated_rank=1,
                submitted_at=now - timedelta(minutes=30)
            ),
            Quote(
                rfq_id=rfq1.id,
                carrier_name="MSC Mediterranean",
                freight_charges=2200.00,
                origin_charges=360.00,
                destination_charges=420.00,
                total_price=2980.00,
                transit_time="26 Days",
                validity_date=now + timedelta(days=14),
                calculated_rank=3,
                submitted_at=now - timedelta(minutes=20)
            )
        ]
        db.add_all(quotes_rfq1)

        log1 = AuctionActivityLog(
            rfq_id=rfq1.id,
            event_type="RFQ_CREATED",
            message="RFQ created with British Auction. Mode: L1_RANK_CHANGE. Window: 10m, Extension: +5m.",
            previous_close_time=rfq1.original_bid_close_time,
            new_close_time=rfq1.original_bid_close_time,
            metadata_payload={"reference_id": rfq1.reference_id}
        )
        db.add(log1)

        # --- RFQ 2: Air Cargo Express - ANY_BID Mode ---
        rfq2 = RFQ(
            reference_id="RFQ-2026-BLR-FRA-02",
            title="Air Express Pharma Cargo - Bangalore to Frankfurt",
            origin="Kempegowda Int'l Airport (BLR)",
            destination="Frankfurt Airport (FRA)",
            pickup_date=now + timedelta(days=3),
            bid_start_time=now - timedelta(hours=1),
            original_bid_close_time=now + timedelta(minutes=8),
            current_bid_close_time=now + timedelta(minutes=8),
            forced_bid_close_time=now + timedelta(minutes=45),
            status="ACTIVE",
            extension_count=0
        )
        db.add(rfq2)
        db.flush()

        cfg2 = AuctionConfig(
            rfq_id=rfq2.id,
            is_british_auction=True,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_mode="ANY_BID"
        )
        db.add(cfg2)

        quotes_rfq2 = [
            Quote(
                rfq_id=rfq2.id,
                carrier_name="Lufthansa Cargo",
                freight_charges=4200.00,
                origin_charges=500.00,
                destination_charges=600.00,
                total_price=5300.00,
                transit_time="36 Hours",
                validity_date=now + timedelta(days=7),
                calculated_rank=1,
                submitted_at=now - timedelta(minutes=25)
            ),
            Quote(
                rfq_id=rfq2.id,
                carrier_name="Emirates SkyCargo",
                freight_charges=4400.00,
                origin_charges=520.00,
                destination_charges=620.00,
                total_price=5540.00,
                transit_time="42 Hours",
                validity_date=now + timedelta(days=7),
                calculated_rank=2,
                submitted_at=now - timedelta(minutes=15)
            )
        ]
        db.add_all(quotes_rfq2)

        # --- RFQ 3: FTL Domestic Corridor - ANY_RANK_CHANGE Mode ---
        rfq3 = RFQ(
            reference_id="RFQ-2026-BOM-DEL-03",
            title="Full Truckload (32ft Multi-Axle) - Mumbai to Delhi",
            origin="Bhiwandi Logistics Hub, Mumbai",
            destination="Okhla Industrial Area, New Delhi",
            pickup_date=now + timedelta(days=2),
            bid_start_time=now - timedelta(hours=3),
            original_bid_close_time=now + timedelta(minutes=6),
            current_bid_close_time=now + timedelta(minutes=6),
            forced_bid_close_time=now + timedelta(minutes=30),
            status="ACTIVE",
            extension_count=0
        )
        db.add(rfq3)
        db.flush()

        cfg3 = AuctionConfig(
            rfq_id=rfq3.id,
            is_british_auction=True,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_mode="ANY_RANK_CHANGE"
        )
        db.add(cfg3)

        quotes_rfq3 = [
            Quote(
                rfq_id=rfq3.id,
                carrier_name="Rivigo Freight",
                freight_charges=750.00,
                origin_charges=80.00,
                destination_charges=90.00,
                total_price=920.00,
                transit_time="48 Hours",
                validity_date=now + timedelta(days=5),
                calculated_rank=1,
                submitted_at=now - timedelta(minutes=40)
            ),
            Quote(
                rfq_id=rfq3.id,
                carrier_name="Delhivery Freight",
                freight_charges=780.00,
                origin_charges=85.00,
                destination_charges=95.00,
                total_price=960.00,
                transit_time="44 Hours",
                validity_date=now + timedelta(days=5),
                calculated_rank=2,
                submitted_at=now - timedelta(minutes=25)
            )
        ]
        db.add_all(quotes_rfq3)

        # --- RFQ 4: Clamping Showcase - Close to Forced Close Ceiling ---
        rfq4 = RFQ(
            reference_id="RFQ-2026-MUN-DXB-04",
            title="Reefer Container (20ft) - Mundra to Jebel Ali",
            origin="Mundra Port, Gujarat (INMUN)",
            destination="Jebel Ali, UAE (AEJEA)",
            pickup_date=now + timedelta(days=5),
            bid_start_time=now - timedelta(hours=4),
            original_bid_close_time=now + timedelta(minutes=2),
            current_bid_close_time=now + timedelta(minutes=2),
            forced_bid_close_time=now + timedelta(minutes=4),  # Only 2 mins before forced close!
            status="ACTIVE",
            extension_count=2
        )
        db.add(rfq4)
        db.flush()

        cfg4 = AuctionConfig(
            rfq_id=rfq4.id,
            is_british_auction=True,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_mode="L1_RANK_CHANGE"
        )
        db.add(cfg4)

        db.commit()
        print("Database seeded successfully with 4 realistic demo RFQs!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
