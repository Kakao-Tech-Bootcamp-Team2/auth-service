const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const errorHandler = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

// 기본 상태 체크
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Auth service is running',
        timestamp: new Date().toISOString()
    });
});

// API 버전 관리
const v1Router = express.Router();

// 요청 로깅 미들웨어
v1Router.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// 기본 보안 헤더
v1Router.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// API 라우트
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);

// API 문서
v1Router.get('/docs', (req, res) => {
    res.redirect('/api-docs');
});

// v1 API 라우트 등록
router.use('/v1', v1Router);

// 404 에러 처리
router.use((req, res, next) => {
    const error = new Error('Route not found');
    error.status = 404;
    next(error);
});

// 에러 핸들러
router.use(errorHandler.handle.bind(errorHandler));

// 프로메테우스 메트릭 엔드포인트 (모니터링용)
router.get('/metrics', (req, res) => {
    // 메트릭 데이터 수집 및 반환 로직
    res.set('Content-Type', 'text/plain');
    res.send('# 메트릭 데이터...');
});

module.exports = router;