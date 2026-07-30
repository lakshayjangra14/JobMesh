import 'dotenv/config';
import app from './server.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`JobMesh API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
