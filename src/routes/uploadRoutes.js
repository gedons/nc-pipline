const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Protected route to upload files
router.post('/upload', authMiddleware, upload.single('file'), uploadController.uploadFile);

module.exports = router;
