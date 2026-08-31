const { Server } = require('socket.io');

let io;

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

const initSocket = (server) => {
    io = new Server(server, {
        path: '/iotdashboardbackend/api/v1/socket.io',
        cors: {
            origin: allowedOrigins.map(o => o.replace(/\/$/, '')),
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    console.log('[Socket.IO] Initialized successfully');
    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = {
    initSocket,
    getIo
};
