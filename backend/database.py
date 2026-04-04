import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker



DATABASE_URL = os.getenv("DATABASE_URL")

# Engine (connection manager)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True  # checks if connection is alive before using
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()