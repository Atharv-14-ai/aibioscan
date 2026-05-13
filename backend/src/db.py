# src/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import os

from src.models import Base, User, Report  # ✅ only import models, no self-import

# ✅ Database URL (from env or default)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin123@localhost:5432/ai_bioscan")

# ✅ Engine + Session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ Initialize DB (create tables)
def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully.")

# ✅ Dependency-style session getter
def get_db():
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        db.rollback()
    finally:
        db.close()
