const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Track who started the chat
  isGroupChat: { type: Boolean, default: false },
  isAIChat: { type: Boolean, default: false }, 
  name: { type: String },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' }
}, { timestamps: true });


module.exports = mongoose.model('Chat', chatSchema);
