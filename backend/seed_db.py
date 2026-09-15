import os
import sys

# Ensure the backend directory is in the path so we can import src
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.db import SessionLocal, init_db
from src.models import User
from src.auth import hash_password

def seed_tester():
    print("Initializing Database...")
    init_db()

    db = SessionLocal()
    try:
        # Check if the user already exists
        email = "test@user.com"
        existing_user = db.query(User).filter(User.email == email).first()
        
        if existing_user:
            print(f"Test user already exists: {existing_user.email}")
            return
        
        print(f"Creating test account with email {email}...")
        test_user = User(
            full_name="Test User",
            email=email,
            password_hash=hash_password("password123")
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print("Test account created successfully!")
        print(f"Login Email: {email}")
        print(f"Login Password: password123")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_tester()
