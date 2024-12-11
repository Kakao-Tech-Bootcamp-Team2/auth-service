const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const logger = require('../utils/logger');

// 라우트 설정 로깅
logger.info('Setting up routes...');
logger.info('Auth routes: /api/v1/auth/*');
logger.info('User routes: /api/v1/users/*');

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

module.exports = router;