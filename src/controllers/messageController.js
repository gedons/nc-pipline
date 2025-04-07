const Message = require('../models/Message');
const Chat = require('../models/Chat');
const redisClient = require('../config/redisClient');

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content, iv, fileUrl  } = req.body;
    const sender = req.user;

    // Validate Inputs
    if (!chatId || typeof chatId !== 'string') {
      return res.status(400).json({ message: 'Invalid chatId' });
    }

    // For text messages, require content and iv
    if (!fileUrl) {
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: 'Invalid content' });
      }
      if (!iv || typeof iv !== 'string') {
        return res.status(400).json({ message: 'Invalid iv' });
      }
    }

    const trimmedContent = content ? content.trim() : '';

    // Validate Chat and Authorization
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(sender._id)) {
      return res.status(404).json({ message: 'Chat not found or not authorized' });
    }

    // Create and Save Message (Use trimmed content and include iv)
    const newMessage = await Message.create({
      chatId,
      sender: sender._id,
      content: trimmedContent,
      iv: fileUrl ? '' : iv,
      fileUrl: fileUrl || ''
    });

    // Update Last Message in Chat
    await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

    // Populate Sender Field (for frontend)
    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username _id');
    
    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

// Get messages for a chat
// exports.getMessages = async (req, res) => {
//   try {
//     const { chatId } = req.params;

//     const chat = await Chat.findById(chatId);
//     if (!chat || !chat.participants.includes(req.user)) {
//       return res.status(404).json({ message: "Chat not found or not authorized" });
//     }
//     // Fetch messages and populate sender fields (username, etc.)
//     const messages = await Message.find({ chatId })
//       .populate("sender", "username email")
//       .sort({ createdAt: 1 });
//     res.json(messages);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching messages", error: error.message });
//   }
// };

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    // Validate if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user)) {
      return res.status(404).json({ message: 'Chat not found or not authorized' });
    }

    // Check if messages for this chat are cached
    const cacheKey = `messages:${chatId}`;
    const cachedMessages = await redisClient.get(cacheKey);
    if (cachedMessages) {
      console.log('Returning cached messages for chat:', chatId);
      return res.json(JSON.parse(cachedMessages));
    }

    // If not cached, fetch messages from the database
    const messages = await Message.find({ chatId })
      .populate("sender", "username email")
      .limit(50)
      .sort({ createdAt: 1 })
      .lean();

    // Cache the result in Redis for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(messages));
    console.log('Cached messages for chat:', chatId);

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

// Edit a message
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newContent } = req.body;
    
    if (!newContent) {
      return res.status(400).json({ message: 'New content is required' });
    }
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    message.content = newContent;
    message.edited = true;
    await message.save();
    
    // Re-fetch message with sender populated
    const updatedMessage = await Message.findById(messageId).populate('sender', 'username email');
    
    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Error editing message', error: error.message });
  }
};

//Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    await Message.findByIdAndDelete(messageId);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
};

