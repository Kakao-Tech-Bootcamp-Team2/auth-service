const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

class RedisClient {
    constructor() {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.client.on('connect', () => {
            logger.info('Redis client connected');
        });

        this.client.on('error', (error) => {
            logger.error('Redis client error:', error);
        });
    }

    async set(key, value, expireTime = null) {
        try {
            if (expireTime) {
                await this.client.setex(key, expireTime, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            logger.error('Redis set error:', error);
            throw error;
        }
    }

    async get(key) {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error('Redis get error:', error);
            throw error;
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error('Redis del error:', error);
            throw error;
        }
    }

    async setHash(key, field, value) {
        try {
            await this.client.hset(key, field, value);
        } catch (error) {
            logger.error('Redis setHash error:', error);
            throw error;
        }
    }

    async getHash(key, field) {
        try {
            return await this.client.hget(key, field);
        } catch (error) {
            logger.error('Redis getHash error:', error);
            throw error;
        }
    }
}

module.exports = new RedisClient();