const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

// JWT 토큰 검증 미들웨어 적용
router.use(authMiddleware.verifyToken);

// 프로필 조회
router.get("/profile", userController.getProfile);

// 프로필 수정 (이름 변경)
router.put("/profile", userController.updateProfile);

// 비밀번호 변경
router.put("/profile/password", userController.changePassword);

// 프로필 이미지 URL 업데이트
router.put("/profile/image", userController.updateProfileImage);

// 계정 삭제
router.delete("/", userController.deleteAccount);

// 활성 세션 목록 조회
router.get("/sessions", userController.getActiveSessions);

// 다른 세션 로그아웃
router.post("/sessions/logout-others", userController.logoutOtherSessions);

module.exports = router;
