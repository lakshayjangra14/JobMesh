import { Router } from 'express';
import prisma from '../lib/prisma.js';
import redis from '../lib/redis.js';
import { QUEUE_NAME } from '../services/queue.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        // Count jobs by status
        const statusCounts = await prisma.job.groupBy({
            by: ['status'],
            _count: { status: true },
        });

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

        // Throughput: jobs completed in last 1 minute and last 1 hour
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const completedLastMinute = await prisma.job.count({
            where: {
                status: 'COMPLETED',
                updatedAt: { gte: oneMinuteAgo },
            },
        });

        const completedLastHour = await prisma.job.count({
            where: {
                status: 'COMPLETED',
                updatedAt: { gte: oneHourAgo },
            },
        });

        // Failure rates
        const totalProcessed = jobs.completed + jobs.failed + jobs.dead;
        const failureRate = totalProcessed > 0
            ? ((jobs.failed + jobs.dead) / totalProcessed * 100).toFixed(2)
            : '0.00';

        // Queue depth
        const queueDepth = await redis.llen(QUEUE_NAME);

        res.status(200).json({
            jobs,
            throughput: {
                lastMinute: completedLastMinute,
                lastHour: completedLastHour,
                avgPerSecond: completedLastHour > 0
                    ? (completedLastHour / 3600).toFixed(2)
                    : '0.00',
            },
            failures: {
                rate: `${failureRate}%`,
                total: jobs.failed + jobs.dead,
            },
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
