const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');
const authService = require('../services/authService');
const { ValidationError } = require('../utils/errors');

class AuthController {
    /**
     * 회원가입
     * POST /api/v1/auth/register
     */
    async register(req, res, next) {
        try {
            const { email, password, name } = req.body;
            
            logger.info(`회원가입 시도: ${email}`);
            
            const result = await authService.register({
                email,
                password,
                name
            });
            
            logger.info(`회원가입 성공: ${email}`);

            res.status(StatusCodes.CREATED).json({
                success: true,
                token: result.accessToken,
                sessionId: result.sessionId,
                user: {
                    _id: result.user._id,
                    email: result.user.email,
                    name: result.user.name,
                    profileImage: result.user.profileImage
                }
            });
        } catch (error) {
            logger.error(`회원가입 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 로그인
     * POST /api/v1/auth/login
     */
    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);

            res.cookie('sessionId', result.sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                domain: process.env.COOKIE_DOMAIN,
                maxAge: 24 * 60 * 60 * 1000
            });

            res.status(StatusCodes.OK).json({
                success: true,
                token: result.accessToken,
                sessionId: result.sessionId,
                user: {
                    _id: result.user._id,
                    email: result.user.email,
                    name: result.user.name,
                    profileImage: result.user.profileImage
                }
            });
        } catch (error) {
            logger.error(`로그인 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 로그아웃
     * POST /api/v1/auth/logout
     */
    async logout(req, res, next) {
        try {
            const { userId } = req.user;
            const sessionId = req.cookies.sessionId;

            logger.info(`로그아웃 시도: ${userId}`);

            await authService.logout(userId, sessionId);

            // 쿠키 제거
            res.clearCookie('sessionId');

            logger.info(`로그아웃 성공: ${userId}`);

            res.status(StatusCodes.OK).json({
                status: 'success',
                message: '로그아웃되었습니다.'
            });
        } catch (error) {
            logger.error(`로그아웃 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 토큰 갱신
     * POST /api/v1/auth/refresh-token
     */
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const sessionId = req.cookies.sessionId;

            logger.info('토큰 갱신 시도');

            const result = await authService.refreshToken(refreshToken, sessionId);

            logger.info('토큰 갱신 성공');

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: {
                    accessToken: result.accessToken
                }
            });
        } catch (error) {
            logger.error(`토큰 갱신 실패: ${error.message}`);
            next(error);
        }
    }

    /**
     * 현재 사용 정보 조회
     * GET /api/v1/auth/me
     */
    async getCurrentUser(req, res, next) {
        try {
            const { userId } = req.user;
            logger.info(`현재 사용자 정보 조회: ${userId}`);
            const user = await authService.getCurrentUser(userId);

            res.status(StatusCodes.OK).json({
                status: 'success',
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        profileImage: user.profileImage,
                        role: user.role,
                        lastActivity: user.lastActivity
                    }
                }
            });
        } catch (error) {
            logger.error(`사용자 정보 조회 실패: ${error.message}`);
            next(error);
        }
    }
}

module.exports = new AuthController();