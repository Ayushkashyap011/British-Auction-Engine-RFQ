from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import rfq_router, quote_router, activity_log_router
# Import all models to ensure they are registered with Base metadata
import app.models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on application startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="British Auction Engine for RFQ System supporting reverse bidding, auto-extensions, and forced close rules.",
    lifespan=lifespan
)

# Enable CORS for frontend applications (React on Vite/CRA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(rfq_router)
app.include_router(quote_router)
app.include_router(activity_log_router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "database": str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url)
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to British Auction Engine API for RFQ Systems",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }
