const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
// It is recommended to use environment variables for API keys
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * POST /api/ai/chat
 * Expects a JSON body with a "messages" property that is an array.
 * Example request body:
 * {
 *   "messages": [
 *     { "role": "user", "content": "What is the capital of France?" }
 *   ]
 * }
 */
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  // Check that "messages" is provided and is an array.
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid messages format. Expected a non-empty array of messages.'
    });
  }

  try {
    // Prepare history for Gemini
    // The last message is the new prompt, previous ones are history
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();

    return res.json({
      success: true,
      data: { role: "assistant", content: text }
    });

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating AI response",
      error: error.message
    });
  }
});

module.exports = router;
