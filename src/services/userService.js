const { User, Session } = require('../models');
const redisClient = require('../utils/redisClient');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, AuthenticationError } = require('../utils/errors');
const config = require('../config');

class UserService {
    /**
     * 프로필 조회
     */
    async getProfile(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    }

    /**
     * 프로필 수정
     */
    async updateProfile(userId, updateData) {
        const allowedUpdates = ['name', 'email'];
        const updates = Object.keys(updateData)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = updateData[key];
                return obj;
            }, {});

        if (updates.email) {
            const existingUser = await User.findOne({ 
                email: updates.email, 
                _id: { $ne: userId } 
            });
            if (existingUser) {
                throw new ValidationError('Email already in use');
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new NotFoundError('User not found');
        }

        logger.info(`Profile updated for user: ${userId}`);
        return user;
    }

    /**
     * 비밀번호 변경
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new NotFoundError('사용자를 찾을 수 없습니다.');
        }

        // 현재 비밀번호 확인
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            throw new ValidationError('현재 비밀번호가 일치하지 않습니다.');
        }

        // 새 비밀번호가 현재 비밀번호와 같은지 확인
        if (currentPassword === newPassword) {
            throw new ValidationError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
        }

        // 비밀번호 변경
        user.password = newPassword;
        await user.save();

        return true;
    }

    /**
     * 다른 세션 로그아웃 (중복 로그인 방지)
     */
    async logoutOtherSessions(userId, currentSessionId = null) {
        // DB에서 다른 세션들 무효화
        await Session.updateMany(
            { 
                userId,
                _id: { $ne: currentSessionId },
                isValid: true
            },
            { 
                $set: { isValid: false }
            }
        );

        // Redis에서 다른 세션들의 캐시 삭제
        const sessionKeys = await redisClient.keys(`session:${userId}:*`);
        for (const key of sessionKeys) {
            if (!currentSessionId || !key.includes(currentSessionId)) {
                await redisClient.del(key);
            }
        }

        logger.info(`Logged out other sessions for user: ${userId}`);
    }

    /**
     * 활성 세션 목록 조회
     */
    async getActiveSessions(userId) {
        const sessions = await Session.find({
            userId,
            isValid: true,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        return sessions;
    }

    /**
     * 계정 삭제
     */
    async deleteAccount(userId, password) {
        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new AuthenticationError('Password is incorrect');
        }

        // 모든 세션 삭제
        await Session.deleteMany({ userId });
        await redisClient.del(`user:${userId}`);

        // 사용자 삭제
        await User.deleteOne({ _id: userId });

        logger.info(`Account deleted: ${userId}`);
        return { message: 'Account successfully deleted' };
    }
}

module.exports = new UserService();