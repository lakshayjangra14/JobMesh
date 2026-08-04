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

export default router;
