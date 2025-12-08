const Message = require('../../models/Message');
const Chat = require('../../models/Chat');
const User = require('../../models/User');
const { getSocketId } = require('../utils/userState');

module.exports = (io, socket) => {
    // Send Message
    socket.on('sendMessage', async ({ chatId, sender, content, iv, fileUrl }, callback) => {
        // Validate basic parameters
        if (!chatId || !sender) {
            console.error("Invalid message data: missing chatId or sender", { chatId, sender });
            if (callback) callback({ success: false, message: "Invalid message data" });
            return;
        }

        // Process content based on type (text vs media)
        let finalContent = "";
        if (fileUrl) {
            finalContent = content && typeof content === 'string' ? content.trim() : "Media file";
            iv = iv || "dummy"; // Media messages might not have IV if not encrypted
        } else {
            if (!content || typeof content !== 'string' || !iv || typeof iv !== 'string') {
                console.error("Invalid text message data:", { chatId, sender, content, iv });
                if (callback) callback({ success: false, message: "Invalid message data" });
                return;
            }
            finalContent = content.trim();
            if (!finalContent) {
                if (callback) callback({ success: false, message: "Message content cannot be empty" });
                return;
            }
        }

        try {
            const isAI = sender === "ai";
            let senderUser = null;

            if (!isAI) {
                senderUser = await User.findById(sender).select('_id username');
                if (!senderUser) {
                    console.error("Invalid sender:", sender);
                    if (callback) callback({ success: false, message: "Invalid sender" });
                    return;
                }
            }

            const message = await Message.create({
                chatId,
                sender: isAI ? "ai" : senderUser._id,
                content: finalContent,
                iv,
                fileUrl: fileUrl || '',
                delivered: true,
                isAI
            });

            await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

            const messageData = {
                ...message.toObject(),
                sender: isAI ? { _id: "ai", username: "AI Assistant" } : { _id: senderUser._id, username: senderUser.username }
            };

            // Broadcast to recipients
            const chat = await Chat.findById(chatId).populate('participants', '_id');
            if (chat && chat.participants) {
                chat.participants.forEach((participant) => {
                    const pId = participant._id.toString();
                    const sId = isAI ? "ai" : senderUser._id.toString();

                    if (pId !== sId) {
                        const recipientSocketId = getSocketId(pId);
                        if (recipientSocketId) {
                            io.to(recipientSocketId).emit('receiveMessage', messageData);
                        }
                    }
                });
            }

            // Confirm to sender
            socket.emit('messageSentConfirmation', messageData);
            if (callback) callback({ success: true, data: messageData });

        } catch (error) {
            console.error('Error sending message:', error);
            if (callback) callback({ success: false, message: "Internal server error" });
        }
    });

    // Message Delivered
    socket.on('messageDelivered', async ({ chatId, messageId }) => {
        if (!chatId || !messageId) return;
        try {
            const updatedMessage = await Message.findByIdAndUpdate(
                messageId,
                { delivered: true },
                { new: true }
            );
            io.to(chatId).emit('messageDelivered', updatedMessage);
        } catch (error) {
            console.error('Error updating delivery status:', error);
        }
    });

    // Message Read
    socket.on('messageRead', async ({ chatId, messageId, userId }) => {
        if (!chatId || !messageId || !userId) return;
        try {
            const updatedMessage = await Message.findByIdAndUpdate(
                messageId,
                { isRead: true },
                { new: true }
            );
            io.to(chatId).emit('messageRead', updatedMessage);
        } catch (error) {
            console.error('Error updating read status:', error);
        }
    });

    // Edit Message
    socket.on('editMessage', async ({ messageId, newContent }, callback) => {
        if (!messageId || !newContent) {
            if (callback) callback({ success: false, message: "Invalid edit data" });
            return;
        }
        try {
            const updatedMessage = await Message.findByIdAndUpdate(
                messageId,
                { content: newContent },
                { new: true }
            ).populate('sender', 'username _id');

            if (updatedMessage) {
                io.to(updatedMessage.chatId.toString()).emit('messageEdited', updatedMessage);
                if (callback) callback({ success: true, data: updatedMessage });
            } else {
                if (callback) callback({ success: false, message: "Message not found" });
            }
        } catch (error) {
            console.error('Error editing message:', error);
            if (callback) callback({ success: false, message: "Internal server error" });
        }
    });

    // Delete Message
    socket.on('deleteMessage', async ({ messageId, chatId }, callback) => {
        if (!messageId || !chatId) {
            if (callback) callback({ success: false, message: "Invalid delete data" });
            return;
        }
        try {
            await Message.findByIdAndDelete(messageId);
            io.to(chatId).emit('messageDeleted', { messageId });
            if (callback) callback({ success: true });
        } catch (error) {
            console.error('Error deleting message:', error);
            if (callback) callback({ success: false, message: "Internal server error" });
        }
    });
};
