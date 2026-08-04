import 'dotenv/config';
import app from './server.js';
import prisma from './lib/prisma.js';
import redis from './lib/redis.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`JobMesh API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);

    // Test database connection
    try {
        await prisma.$connect();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
});
