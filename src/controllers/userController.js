const { StatusCodes } = require('http-status-codes');
const userService = require('../services/userService');
const logger = require('../utils/logger');

class UserController {
    /**
     * 프로필 조회
     * GET /api/v1/users/profile
     */
    async getProfile(req, res, next) {
        try {
            const userId = req.user.userId;
            const profile = await userService.getProfile(userId);

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: { profile }
            });
        } catch (error) {
            logger.error('Error in getProfile:', error);
            next(error);
        }
    }

    /**
     * 프로필 수정
     * PUT /api/v1/users/profile
     */
    async updateProfile(req, res, next) {
        try {
            const userId = req.user.userId;
            const updateData = req.body;
            const updatedProfile = await userService.updateProfile(userId, updateData);

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: { profile: updatedProfile }
            });
        } catch (error) {
            logger.error('Error in updateProfile:', error);
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
                success: true,
                message: '비밀번호가 성공적으로 변경되었습니다.'
            });
        } catch (error) {
            logger.error(`비밀번호 변경 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 활성 세션 목록 조회
     * GET /api/v1/users/sessions
     */
    async getActiveSessions(req, res, next) {
        try {
            const userId = req.user.userId;
            const sessions = await userService.getActiveSessions(userId);

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: { sessions }
            });
        } catch (error) {
            logger.error('Error in getActiveSessions:', error);
            next(error);
        }
    }

    /**
     * 다른 세션 로그아웃
     * POST /api/v1/users/logout-others
     */
    async logoutOtherSessions(req, res, next) {
        try {
            const userId = req.user.userId;
            const currentSessionId = req.session.id;

            await userService.logoutOtherSessions(userId, currentSessionId);

            res.status(StatusCodes.OK).json({
                status: 'success',
                message: 'Successfully logged out from other sessions'
            });
        } catch (error) {
            logger.error('Error in logoutOtherSessions:', error);
            next(error);
        }
    }

    /**
     * 계정 삭제
     * DELETE /api/v1/users
     */
    async deleteAccount(req, res, next) {
        try {
            const userId = req.user.userId;
            const { password } = req.body;

            await userService.deleteAccount(userId, password);

            res.status(StatusCodes.OK).json({
                status: 'success',
                message: 'Account successfully deleted'
            });
        } catch (error) {
            logger.error('Error in deleteAccount:', error);
            next(error);
        }
    }
}

module.exports = new UserController();