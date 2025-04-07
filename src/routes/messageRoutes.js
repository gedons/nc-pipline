const express = require('express');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/send', authMiddleware, messageController.sendMessage);
router.put('/:messageId', messageController.editMessage);
router.delete('/:messageId', messageController.deleteMessage);
router.get('/:chatId', authMiddleware, messageController.getMessages);

module.exports = router;
