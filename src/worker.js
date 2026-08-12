import 'dotenv/config';
import redis from './lib/redis.js';
import prisma from './lib/prisma.js';
import { QUEUE_NAME } from './services/queue.js';

async function processJob(job) {
    console.log(`Processing job ${job.id} [${job.type}]`);

    // Temporary: simulate a failure
    if (job.type === 'fail.test') {
        throw new Error('Simulated failure for testing');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`Job ${job.id} completed successfully`);
}


async function startWorker() {
    console.log('Worker started. Waiting for jobs...');

    while (true) {
        try {
            // Step 1: Wait for a job ID from Redis
            const result = await redis.brpop(QUEUE_NAME, 0);
            const jobId = result[1];

            // Step 2: Fetch full job details from PostgreSQL
            const job = await prisma.job.findUnique({
                where: { id: jobId },
            });

            if (!job) {
                console.error(`Job ${jobId} not found in database. Skipping.`);
                continue;
            }

            if (job.status !== 'QUEUED') {
                console.log(`Job ${jobId} is ${job.status}, not QUEUED. Skipping.`);
                continue;
            }

            // Step 3: Mark job as PROCESSING
            await prisma.job.update({
                where: { id: jobId },
                data: { status: 'PROCESSING', attempts: { increment: 1 } },
            });

            // Step 4: Try to process the job
            try {
                await processJob(job);

                // Step 5a: Success → mark as COMPLETED
                await prisma.job.update({
                    where: { id: jobId },
                    data: { status: 'COMPLETED' },
                });
            } catch (processingError) {
                // Step 5b: Failed → mark as FAILED, save the error
                console.error(`Job ${jobId} failed:`, processingError.message);

                await prisma.job.update({
                    where: { id: jobId },
                    data: {
                        status: 'FAILED',
                        lastError: processingError.message,
                    },
                });
            }
        } catch (error) {
            console.error('Worker error:', error.message);
        }
    }
}

startWorker();
