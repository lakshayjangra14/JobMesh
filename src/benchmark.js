import 'dotenv/config';

const API_URL = 'http://localhost:3000/api/jobs/bulk';
const METRICS_URL = 'http://localhost:3000/api/metrics';
const TOTAL_JOBS = 2000;
const BATCH_SIZE = 100;

async function submitBatch(size) {
    const jobs = [];
    for (let i = 0; i < size; i++) {
        jobs.push({
            type: 'email.send',
            payload: { to: `user${Math.random()}@test.com`, subject: 'Benchmark' },
        });
    }

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs }),
    });
    return res.json();
}

async function getMetrics() {
    const res = await fetch(METRICS_URL);
    return res.json();
}

async function run() {
    const baseline = await getMetrics();
    const baselineCompleted = baseline.jobs.completed;
    console.log(`Baseline: ${baselineCompleted} jobs already completed`);
    console.log(`Submitting ${TOTAL_JOBS} NEW jobs in bulk batches of ${BATCH_SIZE}...\n`);

    const startTime = Date.now();

    for (let i = 0; i < TOTAL_JOBS; i += BATCH_SIZE) {
        const batch = Math.min(BATCH_SIZE, TOTAL_JOBS - i);
        await submitBatch(batch);
        const metrics = await getMetrics();
        const processed = metrics.jobs.completed - baselineCompleted;
        console.log(`Submitted: ${i + batch}/${TOTAL_JOBS} | Processed: ${processed}`);
    }

    const submitTime = (Date.now() - startTime) / 1000;
    console.log(`\nAll jobs submitted in ${submitTime.toFixed(2)}s (${(TOTAL_JOBS / submitTime).toFixed(0)} jobs/sec submission)`);
    console.log('Waiting for workers to finish...\n');

    while (true) {
        const metrics = await getMetrics();
        const newCompleted = metrics.jobs.completed - baselineCompleted;
        const elapsed = (Date.now() - startTime) / 1000;

        if (newCompleted >= TOTAL_JOBS && metrics.queue.depth === 0 && metrics.jobs.processing === 0) {
            console.log(`\n========= BENCHMARK RESULTS =========`);
            console.log(`Total jobs:        ${TOTAL_JOBS}`);
            console.log(`Workers:           9`);
            console.log(`End-to-end time:   ${elapsed.toFixed(2)}s`);
            console.log(`Throughput:        ${(TOTAL_JOBS / elapsed).toFixed(0)} jobs/sec`);
            console.log(`=====================================\n`);
            break;
        }

        console.log(`Processing: ${newCompleted}/${TOTAL_JOBS} | Queue: ${metrics.queue.depth} | ${elapsed.toFixed(1)}s`);
        await new Promise(r => setTimeout(r, 300));
    }
}

run().catch(console.error);
