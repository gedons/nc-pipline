const User = require('../../models/User');
const { addUser, removeUser, getOnlineUsers } = require('../utils/userState');

module.exports = (io, socket) => {
    // Handle user online status
    socket.on('userOnline', (userId) => {
        if (!userId) return;
        addUser(userId, socket.id);
        socket.join(userId);
        io.emit('updateOnlineUsers', getOnlineUsers());
        console.log(`User online: ${userId} (Socket: ${socket.id})`);
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        const userId = removeUser(socket.id);

        if (userId) {
            const lastSeen = new Date();
            // Update the user's lastSeen in the database
            try {
                await User.findByIdAndUpdate(userId, { lastSeen, isOnline: false });
                io.emit('updateOnlineUsers', getOnlineUsers());
                io.emit('userLastSeen', { userId, lastSeen });
                console.log(`User disconnected: ${userId}`);
            } catch (error) {
                console.error('Error updating user status on disconnect:', error);
            }
        } else {
            console.log('Socket disconnected:', socket.id);
        }
    });

    // Auto-reconnect users
    socket.on('reconnect', (userId) => {
        if (userId) {
            addUser(userId, socket.id);
            io.emit('updateOnlineUsers', getOnlineUsers());
            console.log(`User reconnected: ${userId}`);
        }
    });
};
