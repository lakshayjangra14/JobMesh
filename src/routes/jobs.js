import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { enqueueJob } from '../services/queue.js';


const router = Router();

// POST /api/jobs — Submit a new job
router.post('/', async (req, res) => {
    try {
        const { type, payload } = req.body;

        // Validate: type is required
        if (!type) {
            return res.status(400).json({
                error: 'Missing required field: type',
            });
        }

        // Validate: payload is required
        if (!payload) {
            return res.status(400).json({
                error: 'Missing required field: payload',
            });
        }

        // Step 1: Save job to PostgreSQL
        const job = await prisma.job.create({
            data: {
                type,
                payload,
            },
        });

        // Step 2: Push job ID to Redis queue
        await enqueueJob(job.id);

        // Step 3: Respond with the created job
        res.status(201).json(job);
    } catch (error) {
        console.error('Failed to create job:', error.message);
        res.status(500).json({
            error: 'Failed to create job',
        });
    }
});
// POST /api/jobs/bulk — Submit multiple jobs at once
router.post('/bulk', async (req, res) => {
    try {
        const { jobs } = req.body;

        if (!Array.isArray(jobs) || jobs.length === 0) {
            return res.status(400).json({
                error: 'Request body must contain a non-empty "jobs" array',
            });
        }

        // Validate all jobs
        for (const job of jobs) {
            if (!job.type || !job.payload) {
                return res.status(400).json({
                    error: 'Each job must have "type" and "payload"',
                });
            }
        }

        // Bulk insert into PostgreSQL
        const createdJobs = await prisma.job.createManyAndReturn({
            data: jobs.map(j => ({ type: j.type, payload: j.payload })),
        });

        // Bulk push all IDs to Redis using pipeline
        const pipeline = (await import('../lib/redis.js')).default.pipeline();
        for (const job of createdJobs) {
            pipeline.lpush('jobmesh:queue', job.id);
        }
        await pipeline.exec();

        res.status(201).json({
            submitted: createdJobs.length,
            jobs: createdJobs,
        });
    } catch (error) {
        console.error('Failed to create bulk jobs:', error.message);
        res.status(500).json({ error: 'Failed to create bulk jobs' });
    }
});

// GET /api/jobs/dead — List all dead jobs
router.get('/dead', async (req, res) => {
    try {
        const deadJobs = await prisma.job.findMany({
            where: { status: 'DEAD' },
            orderBy: { updatedAt: 'desc' },
        });

        res.status(200).json({
            count: deadJobs.length,
            jobs: deadJobs,
        });
    } catch (error) {
        console.error('Failed to fetch dead jobs:', error.message);
        res.status(500).json({ error: 'Failed to fetch dead jobs' });
    }
});

// POST /api/jobs/:id/retry — Retry a dead job
router.post('/:id/retry', async (req, res) => {
    try {
        const { id } = req.params;

        const job = await prisma.job.findUnique({
            where: { id },
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.status !== 'DEAD') {
            return res.status(400).json({
                error: `Job is ${job.status}, not DEAD. Only dead jobs can be retried.`,
            });
        }

        // Reset the job
        const updatedJob = await prisma.job.update({
            where: { id },
            data: {
                status: 'QUEUED',
                attempts: 0,
                lastError: null,
            },
        });

        // Push back to Redis queue
        await enqueueJob(id);

        res.status(200).json({
            message: 'Job re-queued for retry',
            job: updatedJob,
        });
    } catch (error) {
        console.error('Failed to retry job:', error.message);
        res.status(500).json({ error: 'Failed to retry job' });
    }
});

export default router;
