const onlineUsers = new Map();
const userLastSeen = new Map();

const addUser = (userId, socketId) => {
    onlineUsers.set(userId, socketId);
};

const removeUser = (socketId) => {
    let userIdToRemove = null;
    for (const [userId, id] of onlineUsers.entries()) {
        if (id === socketId) {
            userIdToRemove = userId;
            break;
        }
    }
    if (userIdToRemove) {
        onlineUsers.delete(userIdToRemove);
    }
    return userIdToRemove;
};

const getSocketId = (userId) => {
    return onlineUsers.get(userId);
};

const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};

module.exports = {
    addUser,
    removeUser,
    getSocketId,
    getOnlineUsers,
    userLastSeen
};
