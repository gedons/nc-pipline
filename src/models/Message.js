const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  content: { type: String, required: true },
  iv: { type: String, required: true },
  fileUrl: {type: String},  
  reactions: [{ emoji: String, sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }], 
  isRead: { type: Boolean, default: false },
  isAI: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
