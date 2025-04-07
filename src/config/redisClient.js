// src/config/redisClient.js
const redis = require('redis');

// Create a Redis client (adjust the URL or options as needed)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

// Handle connection events
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Connect to Redis (async)
redisClient.connect();

module.exports = redisClient;
