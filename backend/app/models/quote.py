from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    carrier_name = Column(String(150), nullable=False)
    freight_charges = Column(Numeric(12, 2), nullable=False)
    origin_charges = Column(Numeric(12, 2), nullable=False)
    destination_charges = Column(Numeric(12, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False, index=True)
    transit_time = Column(String(100), nullable=False)
    validity_date = Column(DateTime, nullable=False)
    calculated_rank = Column(Integer, default=1, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    rfq = relationship("RFQ", back_populates="quotes")
