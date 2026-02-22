from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# ── 1. Engine ──────────────────────────────────────────────────────────────
# The engine is the actual connection pool to PostgreSQL.
# 'pool_size=10' means up to 10 concurrent DB connections are kept open.
# 'pool_pre_ping=True' means SQLAlchemy will test a connection before using it.
# This prevents "connection closed" errors after the DB restarts.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,        # Set True if you want to see every SQL query in logs
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True,
)


# ── 2. Session factory ─────────────────────────────────────────────────────
# A "session" is like a single unit of work with the database.
# Think of it as: open a notebook, do your reads/writes, close the notebook.
# 'expire_on_commit=False' means after committing, our Python objects
# don't go stale and need a fresh DB query to access their fields.
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── 3. Base class ──────────────────────────────────────────────────────────
# All our ORM models (like the Job model) will inherit from this.
# It tells SQLAlchemy: "these classes map to database tables".
class Base(DeclarativeBase):
    pass


# ── 4. Dependency function ─────────────────────────────────────────────────
# FastAPI uses "dependency injection" — instead of each route function
# creating its own DB session, they all declare `db: AsyncSession = Depends(get_db)`.
# FastAPI calls get_db() for them, passes the session in, and cleans up after.
async def get_db():
    async with async_session_factory() as session:
        try:
            yield session          # hand the session to the route function
            await session.commit() # commit if everything went OK
        except Exception:
            await session.rollback()  # undo changes if something went wrong
            raise
