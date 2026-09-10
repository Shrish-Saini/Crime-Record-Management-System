from sqlalchemy import Column, Integer, String, Date, Text
from database import Base


class Case(Base):
    __tablename__ = "CASES"

    case_id = Column(Integer, primary_key=True, index=True)
    fir_id = Column(Integer, nullable=False, unique=True)
    case_title = Column(String(150), nullable=False)
    investigating_officer_id = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=True, default="FIR Registered")
    outcome = Column(String(50), nullable=True)
    closing_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)