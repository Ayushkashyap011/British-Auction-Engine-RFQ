from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reference_id = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    origin = Column(String(150), nullable=False)
    destination = Column(String(150), nullable=False)
    pickup_date = Column(DateTime, nullable=False)
    bid_start_time = Column(DateTime, nullable=False)
    original_bid_close_time = Column(DateTime, nullable=False)
    current_bid_close_time = Column(DateTime, nullable=False, index=True)
    forced_bid_close_time = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), default="ACTIVE", index=True, nullable=False)
    extension_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    config = relationship("AuctionConfig", back_populates="rfq", uselist=False, cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="rfq", cascade="all, delete-orphan", order_by="Quote.total_price.asc()")
    activity_logs = relationship("AuctionActivityLog", back_populates="rfq", cascade="all, delete-orphan", order_by="AuctionActivityLog.created_at.desc()")


class AuctionConfig(Base):
    __tablename__ = "auction_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_british_auction = Column(Boolean, default=True, nullable=False)
    trigger_window_minutes = Column(Integer, default=10, nullable=False)
    extension_duration_minutes = Column(Integer, default=5, nullable=False)
    trigger_mode = Column(String(50), default="L1_RANK_CHANGE", nullable=False)  # ANY_BID, ANY_RANK_CHANGE, L1_RANK_CHANGE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    rfq = relationship("RFQ", back_populates="config")
