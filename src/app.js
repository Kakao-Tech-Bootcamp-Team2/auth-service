const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');
const logger = require('./utils/logger');
const config = require('./config');

const app = express();

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-session-id']
}));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 헬스 체크
routes.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 라우트 설정
app.use('/api/v1', routes);

// 에러 핸들러
app.use(errorHandler.handle.bind(errorHandler));

// MongoDB 연결
const connectWithRetry = () => {
  mongoose
    .connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 100,
      minPoolSize: 10
    })
    .then(() => {
      logger.info(`Connected to MongoDB: ${config.mongodb.uri}`);
      logger.info(`MongoDB connection state: ${mongoose.connection.readyState}`);
    })
    .catch((error) => {
      logger.error('MongoDB connection error:', error);
      logger.error('MongoDB connection details:', {
        uri: config.mongodb.uri,
        state: mongoose.connection.readyState
      });
      logger.info('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// 서버 시작
const server = app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  server.close(() => process.exit(1));
});

module.exports = app;