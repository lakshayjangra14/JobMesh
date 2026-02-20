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

    
    BACKOFF_BASE: int = 2

    # An ID for the worker instance (overridden per container in Docker)
    WORKER_ID: str = "worker-local"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
