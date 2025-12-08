const connectionHandler = require('./handlers/connectionHandler');
const chatHandler = require('./handlers/chatHandler');
const messageHandler = require('./handlers/messageHandler');
const callHandler = require('./handlers/callHandler');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('New Socket Connection:', socket.id);

        // Initialize handlers
        connectionHandler(io, socket);
        chatHandler(io, socket);
        messageHandler(io, socket);
        callHandler(io, socket);

        // Global error handling for socket
        socket.on('error', (err) => {
            console.error(`Socket error for ${socket.id}:`, err);
        });
    });
};

module.exports = socketHandler;
