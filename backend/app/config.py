import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "British Auction RFQ Engine"
    debug: bool = True
    port: int = 8000
    host: str = "0.0.0.0"
    
    # Database connection string
    # Supports MySQL (mysqldb or pymysql) with automatic SQLite fallback
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+mysqldb://root:password@localhost:3306/british_auction_rfq"
    )
    use_sqlite_fallback: bool = True
    sqlite_db_url: str = "sqlite:///./british_auction.db"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
