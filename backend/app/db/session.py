from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 1. Create the SQLAlchemy Engine
# The connect_args is specifically required for SQLite to work with FastAPI's async routes
engine = create_engine(
    settings.DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# 2. Create the Session Local class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Create the get_db Dependency Function
def get_db():
    """
    Creates an independent database session/connection per request,
    and automatically closes it when the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()