from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL connection URL
    DATABASE_URL: str = "postgresql+asyncpg://jobmesh:jobmesh@localhost:5432/jobmesh"

    # Redis connection URL
    REDIS_URL: str = "redis://localhost:6379/0"

    # Name of the main job queue in Redis
    QUEUE_NAME: str = "jobs:queue"

    # Name of the Dead Letter Queue in Redis
    DLQ_NAME: str = "jobs:dlq"

    # How many times to retry a failing job before giving up
    MAX_RETRIES: int = 5

    # The base for exponential backoff  (backoff = BASE ^ retry_number)
    # retry 1 → 2^1 = 2s, retry 2 → 2^2 = 4s, retry 3 → 2^3 = 8s ...
    BACKOFF_BASE: int = 2

    # An ID for the worker instance (overridden per container in Docker)
    WORKER_ID: str = "worker-local"

    model_config = {"env_file": ".env", "extra": "ignore"}


# Create a single shared instance — import this everywhere
settings = Settings()
