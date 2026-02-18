Distributed Job Queue System

A fault tolerant, distributed job queue built in Python for reliable background task processing at scale.

Why this project exists

Modern backend systems must handle tasks like sending emails, processing payments, and generating reports without blocking user requests. This project shows how to offload such work to a resilient queue that survives crashes, retries failures, and scales horizontally.

Core capabilities

Asynchronous job processing using worker services
Automatic retries with exponential backoff
Dead letter queue for permanently failed jobs
At least once delivery with idempotent processing
Horizontal scaling with multiple workers
Queue monitoring and basic metrics

System design

Producer API built with FastAPI accepts job requests
Redis acts as the message broker
Workers consume and process jobs in the background
PostgreSQL stores job state and prevents duplicate execution
Docker Compose orchestrates services and enables scaling

How it works

A client submits a job through the API
The job is stored and pushed into the Redis queue
Workers fetch jobs and process them asynchronously
Failures trigger retries with increasing delays
Jobs exceeding retry limits move to the dead letter queue

Tech stack

Python
FastAPI
Redis
PostgreSQL
Docker

Use cases

Email and notification pipelines
Webhook processing systems
Media and data processing
Reliable background task execution
