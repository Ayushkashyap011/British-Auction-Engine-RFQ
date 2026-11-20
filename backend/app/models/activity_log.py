from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AuctionActivityLog(Base):
    __tablename__ = "auction_activity_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # BID_SUBMITTED, AUCTION_EXTENDED, EXTENSION_CLAMPED, AUCTION_CLOSED, AUCTION_FORCE_CLOSED
    message = Column(Text, nullable=False)
    previous_close_time = Column(DateTime, nullable=True)
    new_close_time = Column(DateTime, nullable=True)
    metadata_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    rfq = relationship("RFQ", back_populates="activity_logs")
