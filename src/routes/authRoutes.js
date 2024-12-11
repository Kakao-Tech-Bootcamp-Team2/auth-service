const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const validator = require('../middlewares/validator');
const schemas = require('../utils/validationSchemas');

// 인증 관련 라우트
router.post(
    '/register',
    validator.validateBody(schemas.registerSchema),
    authController.register
);

router.post(
    '/login',
    validator.validateBody(schemas.loginSchema),
    authController.login
);

router.post(
    '/logout',
    authMiddleware.verifyToken,
    authController.logout
);

router.post(
    '/refresh-token',
    validator.validateBody(schemas.refreshTokenSchema),
    authController.refreshToken
);

router.get(
    '/me',
    authMiddleware.verifyToken,
    authController.getCurrentUser
);

module.exports = router;