const Chat = require('../../models/Chat');
const { getSocketId } = require('../utils/userState');

module.exports = (io, socket) => {
    socket.on('voiceCallOffer', async ({ chatId, offer, caller, callerName }, callback) => {
        console.log('[voiceCallOffer] Received voice call offer:', { chatId, caller, callerName });
        try {
            const chat = await Chat.findById(chatId).lean();
            if (chat) {
                chat.participants.forEach((participant) => {
                    if (participant.toString() !== caller.toString()) {
                        const recipientSocketId = getSocketId(participant.toString());
                        if (recipientSocketId) {
                            io.to(recipientSocketId).emit('incomingVoiceCall', { chatId, offer, caller, callerName });
                            console.log(`[voiceCallOffer] Emitted incomingVoiceCall to ${participant}`);
                        }
                    }
                });
                if (callback) callback({ success: true });
            } else {
                if (callback) callback({ success: false, message: 'Chat not found' });
            }
        } catch (error) {
            console.error('[voiceCallOffer] Error:', error);
            if (callback) callback({ success: false, message: 'Internal server error' });
        }
    });

    socket.on('voiceCallAnswer', ({ chatId, answer, caller }) => {
        console.log('[voiceCallAnswer] Received answer for caller:', caller);
        const callerSocketId = getSocketId(caller);
        if (callerSocketId) {
            io.to(callerSocketId).emit('voiceCallAnswer', { chatId, answer });
        }
    });

    socket.on('voiceCallCandidate', async ({ chatId, candidate }) => {
        // Broadcast candidate to other participants
        try {
            const chat = await Chat.findById(chatId).lean();
            if (chat) {
                chat.participants.forEach((participant) => {
                    const recipientSocketId = getSocketId(participant.toString());
                    // Send to everyone except sender (socket.id)
                    // Note: We need to check if recipientSocketId is NOT the current socket.id
                    if (recipientSocketId && recipientSocketId !== socket.id) {
                        io.to(recipientSocketId).emit('voiceCallCandidate', { chatId, candidate });
                    }
                });
            }
        } catch (error) {
            console.error('[voiceCallCandidate] Error:', error);
        }
    });

    socket.on('hangUpVoiceCall', async ({ chatId }) => {
        try {
            const chat = await Chat.findById(chatId).lean();
            if (chat) {
                chat.participants.forEach((participant) => {
                    const recipientSocketId = getSocketId(participant.toString());
                    if (recipientSocketId && recipientSocketId !== socket.id) {
                        io.to(recipientSocketId).emit('hangUpVoiceCall', { chatId });
                    }
                });
            }
        } catch (error) {
            console.error('[hangUpVoiceCall] Error:', error);
        }
    });
};
