const jwt = require('jsonwebtoken');
const { User, Session } = require('../models');
const redisClient = require('../utils/redisClient');
const logger = require('../utils/logger');
const config = require('../config');
const userService = require('./userService');
const { 
    AuthenticationError, 
    ValidationError, 
    NotFoundError 
} = require('../utils/errors');

class AuthService {
    /**
     * 회원가입
     */
    async register(userData) {
        const { email, password, name } = userData;

        // 이메일 중복 체크
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ValidationError('이미 등록된 이메일입니다.');
        }

        // 사용자 생성
        const user = await User.create({
            email,
            password,
            name
        });

        logger.info(`New user registered: ${email}`);
        return user;
    }

    /**
     * 로그인
     */
    async login({ email, password, userAgent, clientIp }) {
        // 사용자 찾기 (비밀번호 필드 포함)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new AuthenticationError('이메일 또는 비밀번호가 잘못되었습니다.');
        }

        // 비밀번호 확인
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new AuthenticationError('이메일 또는 비밀번호가 잘못되었습니다.');
        }

        // 계정 상태 확인
        if (user.status !== 'active') {
            throw new AuthenticationError('계정이 활성화되지 않았습니다.');
        }

        // 토큰 생성
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // 기존 세션 로그아웃 처리
        await userService.logoutOtherSessions(user._id);

        // 세션 생성
        const session = await Session.create({
            userId: user._id,
            token: refreshToken,
            userAgent,
            clientIp,
            expiresAt: new Date(Date.now() + config.jwt.refreshExpiresIn)
        });

        // Redis에 세션 정보 저장
        await redisClient.setex(
            `session:${user._id}:${session._id}`,
            config.jwt.refreshExpiresIn / 1000,
            JSON.stringify({
                sessionId: session._id,
                userAgent,
                clientIp
            })
        );

        // 마지막 로그인 시간 업데이트
        user.lastLogin = new Date();
        await user.save();

        logger.info(`User logged in: ${email}`);
        return { user, accessToken, refreshToken, sessionId: session._id };
    }

    /**
     * 로그아웃
     */
    async logout(userId, sessionId) {
        // 세션 무효화
        await Session.findOneAndUpdate(
            { _id: sessionId, userId },
            { isValid: false }
        );

        // Redis에서 세션 정보 삭제
        await redisClient.del(`session:${userId}:${sessionId}`);

        logger.info(`User logged out: ${userId}`);
    }

    /**
     * 토큰 갱신
     */
    async refreshToken(refreshToken, sessionId) {
        // 리프레시 토큰 검증
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

        // 세션 확인
        const session = await Session.findOne({
            _id: sessionId,
            userId: decoded.userId,
            token: refreshToken,
            isValid: true
        });

        if (!session) {
            throw new AuthenticationError('Invalid refresh token');
        }

        // 사용자 확인
        const user = await User.findById(decoded.userId);
        if (!user || user.status !== 'active') {
            throw new AuthenticationError('User not found or inactive');
        }

        // 새로액세스 토큰 발급
        const accessToken = this.generateAccessToken(user);

        logger.info(`Token refreshed for user: ${user._id}`);
        return { accessToken };
    }

    /**
     * 현재 사용자 정보 조회
     */
    async getCurrentUser(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    }

    /**
     * 액세스 토큰 생성
     */
    generateAccessToken(user) {
        return jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            config.jwt.secret,
            { expiresIn: config.jwt.accessExpiresIn }
        );
    }

    /**
     * 리프레시 토큰 생성
     */
    generateRefreshToken(user) {
        return jwt.sign(
            {
                userId: user._id
            },
            config.jwt.secret,
            { expiresIn: config.jwt.refreshExpiresIn }
        );
    }

}

module.exports = new AuthService();