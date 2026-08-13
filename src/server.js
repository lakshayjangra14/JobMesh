import express from 'express';
import jobRoutes from './routes/jobs.js';
import metricsRoutes from './routes/metrics.js';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamps: new Date().toISOString(),
    });
});

// Job routes
app.use('/api/jobs', jobRoutes);

// Metrics routes
app.use('/api/metrics', metricsRoutes);

export default app;
