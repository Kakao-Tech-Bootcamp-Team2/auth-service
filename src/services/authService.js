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
        try {
            const { email, password, name } = userData;
            
            logger.debug('Registering new user:', { email, name });

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new ValidationError('이미 등록된 이메일입니다.');
            }

            logger.debug('Creating user in database');
            const user = await User.create({
                email,
                password,
                name
            });
            logger.debug('User created successfully:', { userId: user._id });

            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);

            const session = await Session.create({
                userId: user._id,
                userAgent: userData.userAgent || 'Unknown',
                clientIp: userData.clientIp || 'Unknown',
                expiresAt: new Date(Date.now() + config.jwt.refreshExpiresIn)
            });

            logger.info(`New user registered: ${email}`);
            return {
                user: {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    profileImage: user.profileImage
                },
                accessToken,
                refreshToken,
                sessionId: session._id
            };
        } catch (error) {
            logger.error('Error in register:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 로그인
     */
    async login(loginData) {
        const { email, password, userAgent, clientIp } = loginData;
        
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new AuthenticationError('이메일 또는 비밀번호가 잘못되었습니다.');
        }

        // 계정 잠금 확인
        if (user.lockUntil && user.lockUntil > Date.now()) {
            throw new AuthenticationError('계정이 일시적으로 잠겼습니다. 잠시 후 다시 시도해주세요.');
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await user.incLoginAttempts();
            throw new AuthenticationError('이메일 또는 비밀번호가 잘못되었습니다.');
        }

        // 로그인 성공시 초기화
        await user.resetLoginAttempts();

        // 세션 생성
        const session = await Session.create({
            userId: user._id,
            userAgent,
            clientIp,
            expiresAt: new Date(Date.now() + config.jwt.refreshExpiresIn)
        });

        // 디바이스 정보 업데이트
        await User.findByIdAndUpdate(user._id, {
            $push: {
                devices: {
                    deviceId: session._id,
                    userAgent,
                    lastLogin: new Date(),
                    isActive: true
                }
            },
            lastActivity: new Date()
        });

        // 토큰 생성
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        return {
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                profileImage: user.profileImage
            },
            accessToken,
            refreshToken,
            sessionId: session._id
        };
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