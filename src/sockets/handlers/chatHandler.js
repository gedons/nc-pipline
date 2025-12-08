module.exports = (io, socket) => {
    // Join a chat room
    socket.on('joinRoom', (chatId) => {
        if (!chatId) return;
        socket.join(chatId);
        // console.log(`Socket ${socket.id} joined room ${chatId}`);
    });

    // Typing indicators
    socket.on('typing', (data) => {
        if (data.chatId) {
            socket.to(data.chatId).emit('typing', data);
        }
    });

    socket.on('stopTyping', (data) => {
        if (data.chatId) {
            socket.to(data.chatId).emit('stopTyping', data);
        }
    });
};
