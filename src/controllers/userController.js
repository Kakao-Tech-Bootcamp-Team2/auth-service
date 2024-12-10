const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');
const userService = require('../services/userService');

class UserController {
    /**
     * 프로필 수정
     * PUT /api/v1/users/profile
     */
    async updateProfile(req, res, next) {
        try {
            const { userId } = req.user;
            const updateData = req.body;

            logger.info(`프로필 수정 시도: ${userId}`);

            const updatedUser = await userService.updateProfile(userId, updateData);

            logger.info(`프로필 수정 성공: ${userId}`);

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: {
                    user: {
                        id: updatedUser._id,
                        email: updatedUser.email,
                        name: updatedUser.name,
                        profileImage: updatedUser.profileImage
                    }
                }
            });
        } catch (error) {
            logger.error(`프로필 수정 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 비밀번호 변경
     * PUT /api/v1/users/password
     */
    async changePassword(req, res, next) {
        try {
            const { userId } = req.user;
            const { currentPassword, newPassword } = req.body;

            logger.info(`비밀번호 변경 시도: ${userId}`);

            await userService.changePassword(userId, currentPassword, newPassword);

            logger.info(`비밀번호 변경 성공: ${userId}`);

            res.status(StatusCodes.OK).json({
                status: 'success',
                message: '비밀번호가 성공적으로 변경되었습니다.'
            });
        } catch (error) {
            logger.error(`비밀번호 변경 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 프로필 이미지 업로드
     * POST /api/v1/users/profile-image
     */
    async uploadProfileImage(req, res, next) {
        try {
            const { userId } = req.user;
            const { imageUrl } = req.body;

            if (!imageUrl) {
                throw new ValidationError('이미지 URL이 필요합니다.');
            }

            logger.info(`프로필 이미지 업로드 시도: ${userId}`);

            const updatedUser = await userService.updateProfileImageUrl(userId, imageUrl);

            logger.info(`프로필 이미지 업로드 성공: ${userId}`);

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: {
                    user: {
                        id: updatedUser._id,
                        email: updatedUser.email,
                        name: updatedUser.name,
                        profileImage: updatedUser.profileImage
                    }
                }
            });
        } catch (error) {
            logger.error(`프로필 이미지 업로드 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 활성 세션 목록 조회
     * GET /api/v1/users/sessions
     */
    async getActiveSessions(req, res, next) {
        try {
            const { userId } = req.user;

            logger.info(`활성 세션 조회: ${userId}`);

            const sessions = await userService.getActiveSessions(userId);

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: {
                    sessions
                }
            });
        } catch (error) {
            logger.error(`활성 세션 조회 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 다른 세션 로그아웃
     * POST /api/v1/users/logout-others
     */
    async logoutOtherSessions(req, res, next) {
        try {
            const { userId } = req.user;
            const currentSessionId = req.cookies.sessionId;

            logger.info(`다른 세션 로그아웃 시도: ${userId}`);

            await userService.logoutOtherSessions(userId, currentSessionId);

            logger.info(`다른 세션 로그��웃 성공: ${userId}`);

            res.status(StatusCodes.OK).json({
                status: 'success',
                message: '다른 모든 세션에서 로그아웃되었습니다.'
            });
        } catch (error) {
            logger.error(`다른 세션 로그아웃 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 계정 삭제
     * DELETE /api/v1/users
     */
    async deleteAccount(req, res, next) {
        try {
            const { userId } = req.user;
            const { password } = req.body;

            logger.info(`계정 삭제 시도: ${userId}`);

            await userService.deleteAccount(userId, password);

            // 쿠키 제거
            res.clearCookie('sessionId');

            logger.info(`계정 삭제 성공: ${userId}`);

            res.status(StatusCodes.OK).json({
                status: 'success',
                message: '계정이 성공적으로 삭제되었습니다.'
            });
        } catch (error) {
            logger.error(`계정 삭제 실패: ${error.message}`);
            next(error);
        }
    }
}

module.exports = new UserController();