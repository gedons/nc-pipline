// src/middleware/cacheMiddleware.js
const redisClient = require('../config/redisClient');

const cache = (keyPrefix, duration = 3600) => {
  return async (req, res, next) => {
    const key = `${keyPrefix}:${req.originalUrl}`;
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        console.log(`Cache hit for key: ${key}`);
        return res.json(JSON.parse(cachedData));
      }
      console.log(`Cache miss for key: ${key}`);
      // Overwrite res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache the body data for 'duration' seconds
        redisClient.setEx(key, duration, JSON.stringify(body));
        return originalJson(body);
      };
      next();
    } catch (error) {
      console.error('Redis caching error:', error);
      next(); // On error, skip caching and continue
    }
  };
};

module.exports = cache;
