// redisClient.js
require("dotenv").config();
const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

redis.on("connect", () => {
  console.log("Redis client connected to the server");
});

redis.on("ready", () => {
  console.log("Redis client is ready to use");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("close", () => {
  console.log("Redis connection has closed");
});

redis.on("reconnecting", () => {
  console.log("Redis client is attempting to reconnect");
});

module.exports = redis;
