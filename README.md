Distributed Job Queue System

A fault tolerant, distributed job queue built in Python that processes background tasks reliably and at scale. This project simulates the core mechanics behind systems like AWS SQS, enabling asynchronous processing, automatic retries, and horizontal scaling.

Why this exists
Modern backend systems must handle tasks such as sending emails, processing payments, and generating reports without slowing down user requests. This project demonstrates how to offload such work to a resilient queue that survives crashes, handles failures, and scales under load.

Core Capabilities
Asynchronous job processing using worker services
Automatic retries with exponential backoff
Dead letter queue for permanently failed jobs
At least once delivery with idempotent processing
Horizontal scaling with multiple workers
Queue monitoring and basic metrics

System Design
Producer API built with FastAPI accepts job requests
Redis acts as the high speed message broker
Workers consume and process jobs in the background
PostgreSQL stores job state and prevents duplicate execution
Docker Compose orchestrates services and enables scaling

How it works
A client submits a job through the API
The job is stored and pushed into the Redis queue
Workers fetch jobs and process them asynchronously
Failures trigger retries with increasing delays
Jobs that exceed retry limits are moved to the dead letter queue

Tech Stack
Python
FastAPI
Redis
PostgreSQL
Docker

Where this applies
Email and notification pipelines
Webhook processing systems
Media and data processing
Any backend requiring reliable background tasks

This project demonstrates practical distributed systems design and backend engineering skills relevant to production environments.
