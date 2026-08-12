import redis from '../lib/redis.js';

const QUEUE_NAME = 'jobmesh:queue';

export async function enqueueJob(jobId) {
    await redis.lpush(QUEUE_NAME, jobId);
}

export function calculateBackoff(attempt) {
    const baseDelay = 2000; // 2 seconds
    return baseDelay * Math.pow(2, attempt - 1);
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export { QUEUE_NAME };
