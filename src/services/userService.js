const { User, Session } = require("../models");
const redisClient = require("../utils/redisClient");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} = require("../utils/errors");
const config = require("../config");
const bcrypt = require("bcryptjs");

class UserService {
  /**
   * 프로필 조회
   */
  async getProfile(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  /**
   * 프로필 수정
   */
  async updateProfile(userId, updateData) {
    try {
      logger.info(`프로필 업데이트 시도 - userId: ${userId}`, updateData);

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("사용자를 찾을 수 없습니다.");
      }

      // 이름 업데이트
      if (updateData.name) {
        user.name = updateData.name;
      }

      // 프로필 이미지 업데이트 (이미지가 있는 경우에만)
      if (updateData.profileImage !== undefined) {
        user.profileImage = updateData.profileImage || null; // 이미지가 없으면 null로 설정
      }

      await user.save();

      logger.info(`프로필 업데이트 성공 - userId: ${userId}`);

      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
      };
    } catch (error) {
      logger.error(`프로필 업데이트 실패:`, {
        userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info(`비밀번호 변경 시도 - userId: ${userId}`);

      const user = await User.findById(userId).select("+password");
      if (!user) {
        throw new NotFoundError("사용자를 찾을 수 없습니다.");
      }

      // 현재 비밀번호 확인
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        throw new ValidationError("현재 비밀번호가 일치하지 않습니다.");
      }

      // 새 비밀번호 설정
      user.password = newPassword;
      await user.save();

      logger.info(`비밀번호 변경 성공 - userId: ${userId}`);

      return true;
    } catch (error) {
      logger.error(`비밀번호 변경 실패:`, {
        userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
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
        isValid: true,
      },
      {
        $set: { isValid: false },
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
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return sessions;
  }

  /**
   * 계정 삭제
   */
  async deleteAccount(userId, password) {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError("Password is incorrect");
    }

    // 모든 세션 삭제
    await Session.deleteMany({ userId });
    await redisClient.del(`user:${userId}`);

    // 사용자 삭제
    await User.deleteOne({ _id: userId });

    logger.info(`Account deleted: ${userId}`);
    return { message: "Account successfully deleted" };
  }

  /**
   * 프로필 이미지 업데이트
   */
  async updateProfileImage(userId, imageUrl) {
    try {
      logger.info(`프로필 이미지 업데이트 시도 - userId: ${userId}`);

      const user = await User.findByIdAndUpdate(
        userId,
        { profileImage: imageUrl },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError("사용자를 찾을 수 없습니다.");
      }

      logger.info(`프로필 이미지 업데이트 성공 - userId: ${userId}`);

      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
      };
    } catch (error) {
      logger.error(`프로필 이미지 업데이트 실패:`, {
        userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new UserService();
