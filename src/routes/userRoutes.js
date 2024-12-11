const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const validator = require('../middlewares/validator');
const schemas = require('../utils/validationSchemas');

// 모든 라우트에 인증 미들웨어 적용
router.use(authMiddleware.verifyToken);

// 프로필 관리
router.get('/profile', userController.getProfile);
router.put(
    '/profile',
    validator.validateBody(schemas.changePasswordSchema),
    userController.changePassword
);

// 세션 관리
router.get('/sessions', userController.getActiveSessions);
router.post('/logout-others', userController.logoutOtherSessions);

// 계정 삭제
router.delete(
    '/',
    validator.validateBody(schemas.deleteAccountSchema),
    userController.deleteAccount
);

module.exports = router;