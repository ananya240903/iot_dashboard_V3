process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('[Uncaught Exception] error:', err, 'origin:', origin);
});

const express = require('express');
const { serverConfig } = require('./src/config');
const cors = require('cors');
const apiRoutes = require('./src/routes');
const authMiddleware = require('./src/utils/authMiddleware');

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
const corsOptions = {
    origin: allowedOrigins.map(o => o.replace(/\/$/, '')),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/iotdashboardbackend/api', authMiddleware, apiRoutes);

const { pool } = require('./src/config/db');

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack)
    }
    console.log('Connected to PostgreSQL');
    release();
    
    // Initialize Background Cron Jobs
    const { initCronJobs } = require('./src/cron/cacheWarmer');
    initCronJobs();

    // Initialize Database Listener for WebSockets
    const { initDbListener } = require('./src/cron/dbListener');
    initDbListener();
});

const http = require('http');
const { initSocket } = require('./src/socket');

const server = http.createServer(app);
initSocket(server);

server.listen(serverConfig.PORT, () => {
    console.log(`Server is running on ${serverConfig.PORT}`);
});