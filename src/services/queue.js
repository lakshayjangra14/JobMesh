import redis from '../lib/redis.js';

const QUEUE_NAME = 'jobmesh:queue';

export async function enqueueJob(jobId) {
    await redis.lpush(QUEUE_NAME, jobId);
}

export { QUEUE_NAME };
