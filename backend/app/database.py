import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

def get_engine():
    target_url = settings.database_url
    try:
        if target_url.startswith("sqlite"):
            engine = create_engine(
                target_url,
                connect_args={"check_same_thread": False}
            )
        else:
            engine = create_engine(
                target_url,
                pool_pre_ping=True,
                pool_recycle=3600
            )
            # Test connection
            with engine.connect() as conn:
                pass
        return engine
    except Exception as e:
        if settings.use_sqlite_fallback:
            logger.warning(f"Could not connect to MySQL at {target_url} ({e}). Falling back to SQLite for local development: {settings.sqlite_db_url}")
            return create_engine(
                settings.sqlite_db_url,
                connect_args={"check_same_thread": False}
            )
        raise e

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
