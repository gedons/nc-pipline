const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

const onlineUsers = new Map();
const userLastSeen = new Map();

const socketHandler = (io) => { 
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user online status
    socket.on('userOnline', (userId) => {
      if (!userId) return;
      onlineUsers.set(userId, socket.id);
      socket.join(userId);
      io.emit('updateOnlineUsers', Array.from(onlineUsers.keys()));
    });

    // Handle disconnection properly and emit last seen
    socket.on('disconnect', async () => {
      const userId = [...onlineUsers.entries()].find(([_, id]) => id === socket.id)?.[0];
    
      if (userId) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        // Update the user's lastSeen in the database
        await User.findByIdAndUpdate(userId, { lastSeen, isOnline: false });
        io.emit('updateOnlineUsers', Array.from(onlineUsers.keys()));
        // Optionally, emit last seen to all clients so they can update the UI
        io.emit('userLastSeen', { userId, lastSeen });
      }
    
      console.log('User disconnected:', socket.id);
    });

    // Join a chat room
    socket.on('joinRoom', (chatId) => {
      if (!chatId) return;
      socket.join(chatId);
    });

    // Typing indicators
    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('typing', data);
    });
  
    socket.on('stopTyping', (data) => {
      socket.to(data.chatId).emit('stopTyping', data);
    });

    // Message sending with proper sender details
    socket.on('sendMessage', async ({ chatId, sender, content, iv, fileUrl }, callback) => {
      // Validate basic parameters
      if (!chatId || !sender) {
        console.error("Invalid message data: missing chatId or sender", { chatId, sender });
        if (callback) callback({ success: false, message: "Invalid message data" });
        return;
      }

      // If fileUrl is provided, we treat this as a media message.
      // For media messages, if no caption is provided, use a default value.
      let finalContent = "";
      if (fileUrl) {
        finalContent = content && typeof content === 'string' ? content.trim() : "Media file";
        // For media messages, we can use a dummy iv.
        iv = iv || "dummy";
      } else {
        // For text messages, require valid content and iv.
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
        // Determine if this is an AI message
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
          iv, // For media messages, iv will be "dummy"
          fileUrl: fileUrl || '',
          delivered: true,
          isAI
        });

        await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

        const messageData = {
          ...message.toObject(),
          // If AI, we send a virtual sender object
          sender: isAI ? { _id: "ai", username: "AI Assistant" } : { _id: senderUser._id, username: senderUser.username }
        };

        // Send message to all participants (excluding sender)
        const chat = await Chat.findById(chatId).populate('participants', '_id');
        chat.participants.forEach((participant) => {
          if ((isAI && participant._id.toString() !== sender) || (!isAI && participant._id.toString() !== senderUser._id.toString())) {
            const recipientSocketId = onlineUsers.get(participant._id.toString());
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('receiveMessage', messageData);
            }
          }
        });

        // Confirm message to sender
        socket.emit('messageSentConfirmation', messageData);
        if (callback) callback({ success: true, data: messageData });
      } catch (error) {
        console.error('Error sending message:', error);
        if (callback) callback({ success: false, message: "Internal server error" });
      }
    });

    // Message delivered status update
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

    
    socket.on('messageRead', async ({ chatId, messageId, userId }) => {
      if (!chatId || !messageId || !userId) return;
      
      try {
        // Update the 'isRead' field in the message document
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { isRead: true },
          { new: true }
        );
        // console.log('[messageRead] Updated message:', updatedMessage);
        // Emit the updated message so that all clients can update their UI accordingly
        io.to(chatId).emit('messageRead', updatedMessage);
      } catch (error) {
        console.error('Error updating read status:', error);
      }
    });
    
    socket.on('editMessage', async ({ messageId, newContent }, callback) => {
      if (!messageId || !newContent) {
        console.error("Invalid edit data:", { messageId, newContent });
        if (callback) callback({ success: false, message: "Invalid edit data" });
        return;
      }
      try {
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { content: newContent },
          { new: true }
        ).populate('sender', 'username _id');
        io.to(updatedMessage.chatId.toString()).emit('messageEdited', updatedMessage);
        if (callback) callback({ success: true, data: updatedMessage });
      } catch (error) {
        console.error('Error editing message:', error);
        if (callback) callback({ success: false, message: "Internal server error" });
      }
    });
    
    socket.on('deleteMessage', async ({ messageId, chatId }, callback) => {
      if (!messageId || !chatId) {
        console.error("Invalid delete data:", { messageId, chatId });
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
    
    socket.on('voiceCallOffer', async ({ chatId, offer, caller }, callback) => {
      console.log('[voiceCallOffer] Received voice call offer:', { chatId, offer, caller });
      try {
        // Find the chat by ID (assumes you have a Chat model)
        const chat = await Chat.findById(chatId).lean();
        if (chat) {
          // For each participant in the chat that is not the caller,
          // send the voice call offer (notification) to them.
          chat.participants.forEach((participant) => {
            if (participant.toString() !== caller.toString()) {
              const recipientSocketId = onlineUsers.get(participant.toString());
              if (recipientSocketId) {
                io.to(recipientSocketId).emit('incomingVoiceCall', { chatId, offer, caller });
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

    // Auto-reconnect users and rejoin chat rooms
    socket.on('reconnect', (userId) => {
      if (userId) {
        onlineUsers.set(userId, socket.id);
        io.emit('updateOnlineUsers', Array.from(onlineUsers.keys()));
        console.log(`User reconnected: ${userId}`);
      }
    });
  });
};

module.exports = socketHandler;
