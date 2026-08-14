import 'dotenv/config';
import redis from './lib/redis.js';
import prisma from './lib/prisma.js';
import { QUEUE_NAME, enqueueJob, calculateBackoff, sleep } from './services/queue.js';

const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;

async function processJob(job) {
    // Simulate a failure for testing
    if (job.type === 'fail.test') {
        throw new Error('Simulated failure for testing');
    }

    // Route to handlers based on job type
    switch (job.type) {
        case 'email.send':
            break;
        case 'report.generate':
            break;
        default:
            break;
    }
}

async function startWorker() {
    console.log(`[${WORKER_ID}] Worker started. Waiting for jobs...`);

    while (true) {
        try {
            // Step 1: Wait for a job ID from Redis
            const result = await redis.brpop(QUEUE_NAME, 0);
            const jobId = result[1];

            // Step 2: Claim the job — update to PROCESSING and get data in ONE query
            // (Previously: findUnique + update = 2 queries. Now: just update = 1 query)
            let job;
            try {
                job = await prisma.job.update({
                    where: { id: jobId },
                    data: { status: 'PROCESSING', attempts: { increment: 1 } },
                });
            } catch (err) {
                // Job not found in DB — skip
                console.error(`[${WORKER_ID}] Job ${jobId} not found. Skipping.`);
                continue;
            }

            // Step 3: Process the job
            try {
                await processJob(job);

                // Success → COMPLETED
                await prisma.job.update({
                    where: { id: jobId },
                    data: { status: 'COMPLETED' },
                });
            } catch (processingError) {
                console.error(`[${WORKER_ID}] Job ${jobId} failed:`, processingError.message);

                if (job.attempts >= job.maxRetries) {
                    console.error(`[${WORKER_ID}] Job ${jobId} exhausted all ${job.maxRetries} retries. DEAD.`);

                    await prisma.job.update({
                        where: { id: jobId },
                        data: {
                            status: 'DEAD',
                            lastError: processingError.message,
                        },
                    });
                } else {
                    const delay = calculateBackoff(job.attempts);
                    console.log(`[${WORKER_ID}] Job ${jobId} retry in ${delay}ms (${job.attempts}/${job.maxRetries})`);

                    await prisma.job.update({
                        where: { id: jobId },
                        data: {
                            status: 'QUEUED',
                            lastError: processingError.message,
                        },
                    });

                    await sleep(delay);
                    await enqueueJob(jobId);
                }
            }
        } catch (error) {
            console.error(`[${WORKER_ID}] Worker error:`, error.message);
        }
    }
}

startWorker();
