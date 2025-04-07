// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { HfInference } = require('@huggingface/inference');

// Get your Hugging Face API key from your .env file
const hfApiKey = process.env.HF_API_KEY;
if (!hfApiKey) {
  console.error("HF_API_KEY is not defined in the environment variables");
}

const client = new HfInference(hfApiKey);

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
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid messages format. Expected an array of messages.' 
    });
  }

  try {
    // Call the Hugging Face Inference API using the provided model.
    const response = await client.chatCompletion({
      model: "deepseek-ai/DeepSeek-R1",
      messages: messages,
      provider: "fireworks-ai", 
      max_tokens: 500,
    });

    if (response.choices && response.choices.length > 0) {
      return res.json({ 
        success: true, 
        message: response.choices[0].message 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'No response from model' 
      });
    }
  } catch (error) {
    console.error("Error calling Hugging Face Inference API:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error generating AI response", 
      error: error.message 
    });
  }
});

module.exports = router;
