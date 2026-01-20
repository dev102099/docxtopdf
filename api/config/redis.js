const Queue = require("bull");

const redisConfig = {
  host: process.env.REDIS_HOST || "redis", // 'redis' is the service name in docker-compose
  port: 6379,
  maxRetriesPerRequest: null,
};

// Create a queue with the specified Redis connection
const jobQueue = new Queue("jobQueue", { redis: redisConfig });

module.exports = jobQueue;
