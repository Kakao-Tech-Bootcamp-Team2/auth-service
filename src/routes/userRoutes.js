const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const validator = require('../middlewares/validator');
const schemas = require('../utils/validationSchemas');

// 사용자 관련 라우트
router.use(authMiddleware.verifyToken); // 모든 라우트에 인증 미들웨어 적용

router.put(
    '/profile',
    validator.validateBody(schemas.updateProfileSchema),
    userController.updateProfile
);

router.put(
    '/password',
    validator.validateBody(schemas.changePasswordSchema),
    userController.changePassword
);

router.post(
    '/profile-image',
    validator.validateBody(schemas.updateProfileImageSchema),
    userController.uploadProfileImage
);

router.get(
    '/sessions',
    userController.getActiveSessions
);

router.post(
    '/logout-others',
    userController.logoutOtherSessions
);

router.delete(
    '/',
    validator.validateBody(schemas.deleteAccountSchema),
    userController.deleteAccount
);

module.exports = router;