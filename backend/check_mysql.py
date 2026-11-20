import os
import sys
from dotenv import load_dotenv

# Load .env
load_dotenv()

from sqlalchemy import create_engine, text

def check_connection():
    db_url = os.getenv("DATABASE_URL", "mysql+mysqldb://root:root@localhost:3306/british_auction_rfq")
    print(f"\n--- Testing MySQL Connection via SQLAlchemy ---")
    print(f"Connecting to: {db_url}")

    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION();"))
            version = result.scalar()
            print(f"\n SUCCESS! Connected to MySQL successfully!")
            print(f" MySQL Server Version: {version}")
            
            # Check tables
            tables_result = conn.execute(text("SHOW TABLES;"))
            tables = [row[0] for row in tables_result.fetchall()]
            print(f" Current Tables in 'british_auction_rfq': {tables if tables else 'None yet (will be created automatically)'}\n")
            return True
    except Exception as e:
        print(f"\n CONNECTION FAILED: {e}\n")
        print("Tip: Ensure MySQL is running on port 3306, the database exists, and the username/password in .env is correct.")
        return False

if __name__ == "__main__":
    check_connection()
