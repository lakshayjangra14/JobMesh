<div align="center">

# 🔷 JobMesh

**A distributed job queue system built from scratch**

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

Submit jobs via REST API → Queue in Redis → Process with scalable workers → Retry with exponential backoff

</div>

---

## 📖 What Is This?

JobMesh is a production-style **distributed job queue** that decouples job submission from processing. Instead of doing slow tasks (sending emails, generating reports, processing images) inside an HTTP request and making the user wait, JobMesh accepts the task instantly and processes it in the background.

**Think of it like a post office:**
- You hand your package to the **clerk** (API) → instant, takes 1 second
- The clerk puts it in the **mailbag** (Redis queue)
- A **delivery driver** (worker) picks it up and delivers it
- If delivery fails, they **retry** with increasing delays
- After 3 failed attempts, it goes to the **dead letter office** (DLQ)

---

## 🏗️ Architecture

```
┌──────────┐         ┌───────────────┐         ┌───────────┐         ┌──────────────┐
│          │  POST   │               │  LPUSH  │           │  BRPOP  │              │
│  Client  │────────▶│  API Server   │────────▶│   Redis   │◀────────│  Worker(s)   │
│          │         │  (Express)    │         │  (Queue)  │         │  (Processor) │
└──────────┘         └───────┬───────┘         └───────────┘         └──────┬───────┘
                             │                                              │
                             │           ┌──────────────┐                   │
                             └──────────▶│  PostgreSQL   │◀─────────────────┘
                                         │  (Database)   │
                                         └──────────────┘
```

| Component | Role |
|-----------|------|
| **API Server** | Accepts jobs via REST, validates input, saves to database, pushes to queue |
| **Redis** | In-memory FIFO queue. Workers use `BRPOP` (blocking pop) — zero CPU when idle |
| **PostgreSQL** | Permanent storage for all job metadata, status, errors, and retry counts |
| **Worker(s)** | Independent processes that pop jobs, execute them, handle retries |

---

## ✨ Features

- **REST API** — Submit single jobs or bulk-submit hundreds in one request
- **Redis-backed queue** — FIFO ordering with `LPUSH`/`BRPOP`, sub-millisecond operations
- **Horizontal scaling** — Spin up N workers, Redis ensures zero duplicate processing
- **Exponential backoff retries** — Failed jobs retry with 2s → 4s → 8s delays
- **Dead Letter Queue** — Permanently failed jobs are isolated, queryable, and manually retryable
- **Real-time monitoring** — `/api/metrics` endpoint with queue depth, throughput, failure rates
- **Docker Compose** — One command runs the full stack with health checks and restart policies
- **Benchmarking** — Built-in benchmark script to measure actual throughput

---

## 🔄 Job Lifecycle

```
                              ┌─────────────┐
                   ┌─────────▶│   QUEUED     │◀──── Job submitted
                   │          └──────┬───────┘
                   │                 │ Worker picks up
                   │                 ▼
                   │          ┌─────────────┐
              retry│          │ PROCESSING  │
           (backoff)          └──┬────────┬──┘
                   │             │        │
                   │         success    failure
                   │             │        │
                   │             ▼        ▼
                   │      ┌──────────┐ ┌────────┐
                   │      │COMPLETED │ │ FAILED │
                   │      │    ✅     │ └───┬────┘
                   │      └──────────┘     │
                   │               retries left?
                   │               ┌──────┴──────┐
                   └──── yes ──────┘             │
                                             no  ▼
                                          ┌──────────┐
                                          │   DEAD   │
                                          │    💀    │
                                          └──────────┘
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |
| `POST` | `/api/jobs` | Submit a single job |
| `POST` | `/api/jobs/bulk` | Submit multiple jobs at once |
| `GET` | `/api/jobs/dead` | List all permanently failed jobs |
| `POST` | `/api/jobs/:id/retry` | Retry a dead job |
| `GET` | `/api/metrics` | Queue depth, throughput, failure rates |

### Submit a job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"type": "email.send", "payload": {"to": "user@example.com", "subject": "Welcome!"}}'
```

**Response:**
```json
{
  "id": "a1b2c3d4-...",
  "type": "email.send",
  "payload": { "to": "user@example.com", "subject": "Welcome!" },
  "status": "QUEUED",
  "attempts": 0,
  "maxRetries": 3,
  "createdAt": "2026-08-15T..."
}
```

### Check system metrics

```bash
curl http://localhost:3000/api/metrics
```

**Response:**
```json
{
  "jobs": { "queued": 5, "processing": 2, "completed": 143, "failed": 0, "dead": 1, "total": 151 },
  "throughput": { "lastMinute": 12, "lastHour": 143, "avgPerSecond": "0.04" },
  "failures": { "rate": "0.69%", "total": 1 },
  "queue": { "depth": 5 },
  "uptime": 3600
}
```

---

## 📂 Project Structure

```
JobMesh/
├── prisma/
│   ├── schema.prisma              # Job model + status enum
│   └── migrations/                # Version-controlled schema changes
├── src/
│   ├── lib/
│   │   ├── prisma.js              # Shared PostgreSQL connection (singleton)
│   │   └── redis.js               # Shared Redis connection (singleton)
│   ├── routes/
│   │   ├── jobs.js                # Job submission + DLQ endpoints
│   │   └── metrics.js             # Monitoring & metrics endpoint
│   ├── services/
│   │   └── queue.js               # Redis queue operations + backoff
│   ├── index.js                   # Entry point — starts the server
│   ├── server.js                  # Express app configuration
│   ├── worker.js                  # Job processor (runs independently)
│   └── benchmark.js               # Throughput benchmarking script
├── docker-compose.yml             # Full stack orchestration
├── Dockerfile                     # Container build instructions
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) and Docker Compose
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/lakshayjangra14/JobMesh.git
cd JobMesh
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://jobmesh:jobmesh123@localhost:5432/jobmesh
REDIS_URL=redis://localhost:6379
```

### 4. Start PostgreSQL and Redis

```bash
docker-compose up -d postgres redis
```

Verify both containers are running:

```bash
docker ps
```

You should see `postgres:16-alpine` and `redis:7-alpine` containers.

### 5. Run database migrations

```bash
npx prisma migrate dev
```

This creates the `Job` table in PostgreSQL based on the Prisma schema.

### 6. Generate Prisma client

```bash
npx prisma generate
```

### 7. Start the API server

```bash
npm run dev
```

The server starts at `http://localhost:3000`. You should see:

```
JobMesh API server running on port 3000
Database connected successfully
Redis connected successfully
```

### 8. Start a worker (in a new terminal)

```bash
npm run worker
```

The worker connects to Redis and waits for jobs:

```
Worker started. Waiting for jobs...
```

### 9. Submit a job (in another terminal)

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"type": "email.send", "payload": {"to": "test@example.com", "subject": "Hello!"}}'
```

Watch the worker terminal — it picks up and processes the job instantly.

---

## ⚡ Running the Benchmark

Start the API server + multiple workers, then run:

```bash
# Terminal 1
npm run dev

# Terminals 2-9 (start 8 workers)
WORKER_ID=w1 node src/worker.js
WORKER_ID=w2 node src/worker.js
# ... up to w8

# Terminal 10
npm run benchmark
```

**Measured throughput: ~300 jobs/sec** on a single-node Docker deployment with 9 workers.

---

## 🐳 Full Docker Deployment

Run the entire stack (API + workers + PostgreSQL + Redis) with one command:

```bash
docker-compose up -d --scale worker=5
```

Stop everything:

```bash
docker-compose down
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js** | JavaScript runtime |
| **Express v5** | HTTP API framework |
| **PostgreSQL 16** | Persistent job storage (ACID-compliant) |
| **Redis 7** | In-memory job queue (LPUSH/BRPOP) |
| **Prisma v7** | ORM with migrations and type-safe queries |
| **ioredis** | Redis client with auto-reconnection |
| **Docker Compose** | Multi-container orchestration |

---

## 📄 License

ISC

---

<div align="center">

Built by [Lakshay Jangra](https://github.com/lakshayjangra14)

</div>
