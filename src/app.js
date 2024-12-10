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

// 미들웨어 설정
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트 설정
app.use('/api', routes);

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 에러 핸들러
app.use(errorHandler.handle.bind(errorHandler));

// MongoDB 연결
mongoose
  .connect(config.mongodb.uri)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// 서버 시작
const server = app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  server.close(() => process.exit(1));
});

module.exports = app;