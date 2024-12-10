const { User, Session } = require('../models');
const redisClient = require('../utils/redisClient');
const logger = require('../utils/logger');
const { 
    ValidationError, 
    NotFoundError, 
    AuthenticationError 
} = require('../utils/errors');

class UserService {
    /**
     * 프로필 수정
     */
    async updateProfile(userId, updateData) {
        // 수정 가능한 필드 필터링
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
                throw new ValidationError('이미 사용 중인 이메일입니다.');
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        );

        if (!user) {
            throw new NotFoundError('사용자를 찾을 수 없습니다.');
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
            throw new AuthenticationError('현재 비밀번호가 일치하지 않습니다.');
        }

        // 새 비밀번호로 업데이트
        user.password = newPassword;
        await user.save();

        // 다른 세션 로그아웃
        await this.logoutOtherSessions(userId);

        logger.info(`Password changed for user: ${userId}`);
    }

    /**
     * 프로필 이미지 업로드
     */
    async updateProfileImageUrl(userId, imageUrl) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('사용자를 찾을 수 없습니다.');
        }

        user.profileImage = imageUrl;
        await user.save();

        logger.info(`Profile image URL updated for user: ${userId}`);
        return user;
    }

    /**
     * 활성 세션 조회
     */
    async getActiveSessions(userId) {
        const sessions = await Session.getActiveSessions(userId);
        return sessions.map(session => ({
            id: session._id,
            userAgent: session.userAgent,
            clientIp: session.clientIp,
            lastActivity: session.lastActivity,
            createdAt: session.createdAt
        }));
    }

    /**
     * 다른 세션 로그아웃
     */
    async logoutOtherSessions(userId, currentSessionId) {
        // 현재 세션을 제외한 모든 세션 무효화
        await Session.updateMany(
            {
                userId,
                _id: { $ne: currentSessionId },
                isValid: true
            },
            { isValid: false }
        );

        // Redis에서 세션 정보 삭제
        const sessionKeys = await redisClient.keys(`session:${userId}:*`);
        for (const key of sessionKeys) {
            if (!key.includes(currentSessionId)) {
                await redisClient.del(key);
            }
        }

        logger.info(`Other sessions logged out for user: ${userId}`);
    }

    /**
     * 계정 삭제
     */
    async deleteAccount(userId, password) {
        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new NotFoundError('사용자를 찾을 수 없습니다.');
        }

        // 비밀번호 확인
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new AuthenticationError('비밀번호가 일치하지 않습니다.');
        }

        // 모든 세션 삭제
        await Session.deleteMany({ userId });

        // Redis에서 모든 세션 정보 삭제
        const sessionKeys = await redisClient.keys(`session:${userId}:*`);
        for (const key of sessionKeys) {
            await redisClient.del(key);
        }

        // 사용자 삭제
        await user.deleteOne();

        logger.info(`Account deleted: ${userId}`);
    }
}

module.exports = new UserService();