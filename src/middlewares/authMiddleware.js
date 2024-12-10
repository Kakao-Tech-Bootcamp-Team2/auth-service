const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const config = require('../config');
const logger = require('../utils/logger');
const redisClient = require('../utils/redisClient');
const { AuthenticationError } = require('../utils/errors');

class AuthMiddleware {
    // JWT 토큰 검증 미들웨어
    async verifyToken(req, res, next) {
        try {
            // Authorization 헤더에서 토큰 추출
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AuthenticationError('No token provided');
            }

            const token = authHeader.split(' ')[1];

            // JWT 토큰 검증
            const decoded = jwt.verify(token, config.jwt.secret);

            // Redis에서 토큰 블랙리스트 확인
            const isBlacklisted = await redisClient.get(`bl_${token}`);
            if (isBlacklisted) {
                throw new AuthenticationError('Token has been invalidated');
            }

            // 사용자 정보를 요청 객체에 추가
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                sessionId: decoded.sessionId
            };

            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                next(new AuthenticationError('Invalid token'));
            } else if (error.name === 'TokenExpiredError') {
                next(new AuthenticationError('Token has expired'));
            } else {
                next(error);
            }
        }
    }

    // 권한 체크 미들웨어
    checkRole(requiredRole) {
        return async (req, res, next) => {
            try {
                const { userId } = req.user;
                const userRole = await redisClient.get(`role_${userId}`);

                if (!userRole || userRole !== requiredRole) {
                    throw new AuthenticationError('Insufficient permissions');
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    // 중복 로그인 체크 미들웨어
    async checkDuplicateLogin(req, res, next) {
        try {
            const { userId, sessionId } = req.user;
            const currentSession = await redisClient.get(`session_${userId}`);

            if (currentSession && currentSession !== sessionId) {
                throw new AuthenticationError('Account is already logged in elsewhere');
            }

            next();
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthMiddleware();