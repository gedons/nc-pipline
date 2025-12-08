const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const redisClient = require('../config/redisClient');

/**
 * Create a new chat (private or group)
 * @route POST /api/chats/create
 * @access Private
 */
exports.createChat = async (req, res) => {
  try {
    const { participantsEmails, isGroupChat, name, isAIChat } = req.body;

    if (!participantsEmails || !Array.isArray(participantsEmails)) {
      return res.status(400).json({
        success: false,
        message: 'Participants must be an array of emails'
      });
    }

    // Convert emails to user IDs
    const participants = await User.find({ email: { $in: participantsEmails } }, '_id email');

    // Get emails that do exist
    const existingEmails = participants.map(user => user.email);

    // Find emails that were requested but do not exist
    const invalidEmails = participantsEmails.filter(email => !existingEmails.includes(email));

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more users not found',
        invalidEmails
      });
    }

    // Extract user IDs
    const participantIds = participants.map(user => user._id);

    if (isGroupChat) {
      if (participantIds.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'A group chat must have at least 3 participants'
        });
      }
    } else {
      if (participantIds.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'A private chat must have exactly 2 participants'
        });
      }

      // Prevent duplicate private chats
      const existingChat = await Chat.findOne({
        participants: { $all: participantIds },
        isGroupChat: false
      });

      if (existingChat) {
        return res.status(400).json({
          success: false,
          message: 'A private chat already exists between these users'
        });
      }
    }

    // Create chat request (pending)
    const newChat = new Chat({
      participants: participantIds,
      isGroupChat,
      name: isGroupChat ? name || 'Unnamed Group' : null,
      status: 'pending',
      isAIChat: isAIChat || false
    });

    await newChat.save();
    res.status(201).json({ success: true, data: newChat });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating chat',
      error: error.message
    });
  }
};

/**
 * Create a new AI chat
 * @route POST /api/chats/ai/create
 * @access Private
 */
exports.createAIChat = async (req, res) => {
  try {
    const userId = req.user;
    // Create a new chat with the AI flag; for AI chat, we store only the user
    const newChat = new Chat({
      participants: [userId],
      isGroupChat: false,
      isAIChat: true,
      name: "AI Chat",
      status: 'accepted'
    });
    await newChat.save();
    res.status(201).json({ success: true, data: newChat });
  } catch (error) {
    console.error("Error creating AI chat:", error);
    res.status(500).json({
      success: false,
      message: "Error creating AI chat",
      error: error.message
    });
  }
};

/**
 * Accept a pending chat
 * @route PUT /api/chats/:chatId/accept
 * @access Private
 */
exports.acceptChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to accept this chat' });
    }

    if (chat.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Chat is already accepted' });
    }

    chat.status = 'accepted';
    await chat.save();

    res.status(200).json({ success: true, message: 'Chat accepted successfully', data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error accepting chat', error: error.message });
  }
};

/**
 * Get pending chats for the user
 * @route GET /api/chats/pending
 * @access Private
 */
exports.getPendingChats = async (req, res) => {
  try {
    const userId = req.user;
    const cacheKey = `pendingChats:${userId}`;

    // Try to get from cache
    const cachedPending = await redisClient.get(cacheKey);
    if (cachedPending) {
      // console.log('Returning cached pending chats for user:', userId);
      return res.status(200).json({ success: true, data: JSON.parse(cachedPending) });
    }

    const pendingChats = await Chat.find({ participants: userId, status: 'pending' })
      .populate('participants', 'email username lastSeen')
      .lean();

    // Cache the pending chats for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(pendingChats));

    res.status(200).json({ success: true, data: pendingChats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pending chats', error: error.message });
  }
};

/**
 * Get all chats for the user
 * @route GET /api/chats
 * @access Private
 */
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user; // Authenticated user
    const cacheKey = `userChats:${userId}`;

    // Try to get from cache
    const cachedChats = await redisClient.get(cacheKey);
    if (cachedChats) {
      // console.log('Returning cached user chats for user:', userId);
      return res.status(200).json({ success: true, data: JSON.parse(cachedChats) });
    }

    // Get all chats where the user is a participant OR the initiator
    const chats = await Chat.find({
      $or: [
        { participants: userId },  // User is part of the chat
        { initiator: userId }       // User initiated the chat
      ],
      status: { $in: ['pending', 'accepted'] } // Only show accepted or pending chats
    })
      .populate('participants', 'email username lastSeen')
      .lean();

    if (!chats.length) {
      return res.status(404).json({ success: false, message: 'No chats found' });
    }

    // Fetch messages for each chat
    const chatWithMessages = await Promise.all(
      chats.map(async (chat) => {
        const messages = await Message.find({ chatId: chat._id })
          .sort({ createdAt: 1 })
          .lean();
        return { ...chat, messages };
      })
    );

    // Cache the chats for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(chatWithMessages));

    res.status(200).json({ success: true, data: chatWithMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user chats', error: error.message });
  }
};

/**
 * Delete a chat
 * @route DELETE /api/chats/:chatId
 * @access Private
 */
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this chat' });
    }

    await Message.deleteMany({ chatId });
    await Chat.findByIdAndDelete(chatId);

    res.status(200).json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting chat', error: error.message });
  }
};


