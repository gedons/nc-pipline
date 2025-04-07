const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authMiddleware, chatController.getUserChats);
router.post('/create', authMiddleware, chatController.createChat);
router.post('/ai/create', authMiddleware, chatController.createAIChat);
router.put('/:chatId/accept', authMiddleware, chatController.acceptChat);
router.get('/pending', authMiddleware, chatController.getPendingChats);
router.delete('/:chatId', authMiddleware, chatController.deleteChat);

module.exports = router;
