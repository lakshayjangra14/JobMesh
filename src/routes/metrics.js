import { Router } from 'express';
import prisma from '../lib/prisma.js';
import redis from '../lib/redis.js';
import { QUEUE_NAME } from '../services/queue.js';

const router = Router();

// GET /api/metrics — System metrics and job statistics
router.get('/', async (req, res) => {
    try {
        // Count jobs by status using Prisma groupBy
        const statusCounts = await prisma.job.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        // Convert array into a clean object
        const jobs = {
            queued: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            dead: 0,
        };

        let total = 0;
        for (const entry of statusCounts) {
            const key = entry.status.toLowerCase();
            jobs[key] = entry._count.status;
            total += entry._count.status;
        }
        jobs.total = total;

        // Get Redis queue depth
        const queueDepth = await redis.llen(QUEUE_NAME);

        res.status(200).json({
            jobs,
            queue: {
                depth: queueDepth,
            },
            uptime: Math.floor(process.uptime()),
        });
    } catch (error) {
        console.error('Failed to fetch metrics:', error.message);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

export default router;
