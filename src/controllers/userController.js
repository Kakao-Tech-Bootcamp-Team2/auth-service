const { StatusCodes } = require("http-status-codes");
const userService = require("../services/userService");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");

class UserController {
  /**
   * 프로필 조회
   */
  async getProfile(req, res, next) {
    try {
      const { userId } = req.user;
      const user = await userService.getProfile(userId);
      res.status(StatusCodes.OK).json({
        status: "success",
        data: { user },
      });
    } catch (error) {
      logger.error(`프로필 조회 실패: ${error.message}`);
      next(error);
    }
  }

  /**
   * 프로필 수정
   */
  async updateProfile(req, res, next) {
    try {
      const { userId } = req.user;
      const { name, currentPassword, newPassword } = req.body;

      // 비밀번호 변경 요청인 경우
      if (currentPassword && newPassword) {
        await userService.changePassword(userId, currentPassword, newPassword);
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "비밀번호가 성공적으로 변경되었습니다.",
        });
      }

      // 프로필 정보 업데이트인 경우
      if (name) {
        const updatedUser = await userService.updateProfile(userId, { name });
        return res.status(StatusCodes.OK).json({
          success: true,
          user: updatedUser,
        });
      }

      throw new ValidationError("업데이트할 정보가 제공되지 않았습니다.");
    } catch (error) {
      logger.error(`프로필 수정 실패: ${error.message}`, {
        userId: req.user?.userId,
        body: req.body,
      });

      // 에러 응답도 프론트엔드 형식에 맞춤
      res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(req, res, next) {
    try {
      const { userId } = req.user;
      const { currentPassword, newPassword } = req.body;

      await userService.changePassword(userId, currentPassword, newPassword);

      res.status(StatusCodes.OK).json({
        status: "success",
        message: "비밀번호가 성공적으로 변경되었습니다.",
      });
    } catch (error) {
      logger.error(`비밀번호 변경 실패: ${error.message}`);
      next(error);
    }
  }

  /**
   * 활로필 이미지 업데이트
   */
  async updateProfileImage(req, res, next) {
    try {
      const { userId } = req.user;
      const { imageUrl } = req.body; // 파일 서비스에서 받은 이미지 URL

      const updatedUser = await userService.updateProfileImage(
        userId,
        imageUrl
      );

      res.status(StatusCodes.OK).json({
        status: "success",
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error(`프로필 이미지 업데이트 실패: ${error.message}`);
      next(error);
    }
  }

  /**
   * 계정 삭제
   */
  async deleteAccount(req, res, next) {
    try {
      const { userId } = req.user;
      const { password } = req.body;

      await userService.deleteAccount(userId, password);

      res.status(StatusCodes.OK).json({
        status: "success",
        message: "계정이 성공적으로 삭제되었습니다.",
      });
    } catch (error) {
      logger.error(`계정 삭제 실패: ${error.message}`);
      next(error);
    }
  }

  /**
   * 활성 세션 목록 조회
   */
  async getActiveSessions(req, res, next) {
    try {
      const { userId } = req.user;
      const sessions = await userService.getActiveSessions(userId);

      res.status(StatusCodes.OK).json({
        status: "success",
        data: { sessions },
      });
    } catch (error) {
      logger.error(`세션 목록 조회 실패: ${error.message}`);
      next(error);
    }
  }

  /**
   * 다른 세션 로그아웃
   */
  async logoutOtherSessions(req, res, next) {
    try {
      const { userId } = req.user;
      const { sessionId } = req.user;

      await userService.logoutOtherSessions(userId, sessionId);

      res.status(StatusCodes.OK).json({
        status: "success",
        message: "다른 세션들이 로그아웃되었습니다.",
      });
    } catch (error) {
      logger.error(`다른 세션 로그아웃 실패: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new UserController();
