import 'dotenv/config';
import redis from './lib/redis.js';
import prisma from './lib/prisma.js';
import { QUEUE_NAME, enqueueJob, calculateBackoff, sleep } from './services/queue.js';

async function processJob(job) {
    console.log(`Processing job ${job.id} [${job.type}] (attempt ${job.attempts + 1}/${job.maxRetries})`);

    // Simulate a failure for testing
    if (job.type === 'fail.test') {
        throw new Error('Simulated failure for testing');
    }

    // Simulate doing work
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

                // Success → COMPLETED
                await prisma.job.update({
                    where: { id: jobId },
                    data: { status: 'COMPLETED' },
                });
            } catch (processingError){
                console.error(`Job ${jobId} failed:`, processingError.message);

                const updatedJob = await prisma.job.findUnique({
                    where: { id: jobId },
                });

                if (updatedJob.attempts >= updatedJob.maxRetries) {
                    // No retries left → DEAD
                    console.error(`Job ${jobId} exhausted all ${updatedJob.maxRetries} retries. Moving to DEAD.`);

                    await prisma.job.update({
                        where: { id: jobId },
                        data: {
                            status: 'DEAD',
                            lastError: processingError.message,
                        },
                    });
                } else {
                    // Retries left → wait, then re-queue
                    const delay = calculateBackoff(updatedJob.attempts);
                    console.log(`Job ${jobId} will retry in ${delay}ms (attempt ${updatedJob.attempts}/${updatedJob.maxRetries})`);

                    await prisma.job.update({
                        where: { id: jobId },
                        data: {
                            status: 'QUEUED',
                            lastError: processingError.message,
                        },
                    });

                    await sleep(delay);
                    await enqueueJob(jobId);
                    console.log(`Job ${jobId} re-queued`);
                }
            }
        } catch (error) {
            console.error('Worker error:', error.message);
        }
    }
}

startWorker();
