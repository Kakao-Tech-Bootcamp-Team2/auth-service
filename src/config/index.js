const dotenv = require('dotenv');
const path = require('path');

const dirname = path.dirname(require.main.filename);

dotenv.config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_service'
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    user: process.env.RABBITMQ_USER,
    pass: process.env.RABBITMQ_PASS
  },
};