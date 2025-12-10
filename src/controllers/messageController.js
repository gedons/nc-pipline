const Message = require('../models/Message');
const Chat = require('../models/Chat');
const redisClient = require('../config/redisClient');

/**
 * Send a message
 * @route POST /api/messages/send
 * @access Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content, iv, fileUrl } = req.body;
    const sender = req.user;

    // Validate Inputs
    if (!chatId || typeof chatId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid chatId' });
    }

    // For text messages, require content and iv
    if (!fileUrl) {
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid content' });
      }
      if (!iv || typeof iv !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid iv' });
      }
    }

    const trimmedContent = content ? content.trim() : '';

    // Validate Chat and Authorization
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(sender._id)) {
      return res.status(404).json({ success: false, message: 'Chat not found or not authorized' });
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

    // Invalidate messages cache
    await redisClient.del(`messages:${chatId}`);

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: 'Error sending message', error: error.message });
  }
};

/**
 * Get messages for a chat
 * @route GET /api/messages/:chatId
 * @access Private
 */
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    // Validate if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user)) {
      return res.status(404).json({ success: false, message: 'Chat not found or not authorized' });
    }

    // Check if messages for this chat are cached
    const cacheKey = `messages:${chatId}`;
    const cachedMessages = await redisClient.get(cacheKey);
    if (cachedMessages) {
      // console.log('Returning cached messages for chat:', chatId);
      return res.json({ success: true, data: JSON.parse(cachedMessages) });
    }

    // If not cached, fetch messages from the database
    const messages = await Message.find({ chatId })
      .populate("sender", "username email")
      .limit(50)
      .sort({ createdAt: 1 })
      .lean();

    // Cache the result in Redis for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(messages));
    // console.log('Cached messages for chat:', chatId);

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: 'Error fetching messages', error: error.message });
  }
};

/**
 * Edit a message
 * @route PUT /api/messages/:messageId
 * @access Private
 */
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newContent } = req.body;

    if (!newContent) {
      return res.status(400).json({ success: false, message: 'New content is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.content = newContent;
    message.edited = true;
    await message.save();

    // Re-fetch message with sender populated
    const updatedMessage = await Message.findById(messageId).populate('sender', 'username email');

    res.status(200).json({ success: true, data: updatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error editing message', error: error.message });
  }
};

/**
 * Delete a message
 * @route DELETE /api/messages/:messageId
 * @access Private
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    await Message.findByIdAndDelete(messageId);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting message', error: error.message });
  }
};

