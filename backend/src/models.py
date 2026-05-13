# src/models.py
from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    disease = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    file_path = Column(String(255))
    meta_info = Column(JSON)  # ✅ renamed, not metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
