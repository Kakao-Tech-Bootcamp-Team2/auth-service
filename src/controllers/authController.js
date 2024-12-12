const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");
const authService = require("../services/authService");
const { ValidationError } = require("../utils/errors");
const Session = require("../models/sessionModel");
const redisClient = require("../utils/redisClient");
const { AuthenticationError } = require("../utils/errors");

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
        name,
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
          profileImage: result.user.profileImage,
        },
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

      res.cookie("sessionId", result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        domain: process.env.COOKIE_DOMAIN,
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        token: result.accessToken,
        sessionId: result.sessionId,
        user: {
          _id: result.user._id,
          email: result.user.email,
          name: result.user.name,
          profileImage: result.user.profileImage,
        },
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
      const userId = req.user?.userId || req.body.userId;
      const sessionId =
        req.headers["x-session-id"] ||
        req.body.sessionId ||
        req.cookies?.sessionId;

      logger.info(`로그아웃 요청 데이터:`, {
        userId,
        sessionId,
        body: req.body,
        headers: {
          authorization: req.headers.authorization,
          "x-session-id": req.headers["x-session-id"],
        },
      });

      if (userId || sessionId) {
        await authService.logout(userId, sessionId);
      }

      if (req.cookies?.sessionId) {
        res.clearCookie("sessionId");
      }

      res.status(StatusCodes.OK).json({
        status: "success",
        message: "로그아웃되었습니다.",
      });
    } catch (error) {
      logger.error(`로그아웃 실패:`, {
        error: error.message,
        userId: req.user?.userId,
        sessionId:
          req.headers["x-session-id"] ||
          req.body.sessionId ||
          req.cookies?.sessionId,
      });
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

      logger.info("토큰 갱신 시도");

      const result = await authService.refreshToken(refreshToken, sessionId);

      logger.info("토큰 갱신 성공");

      res.status(StatusCodes.OK).json({
        status: "success",
        data: {
          accessToken: result.accessToken,
        },
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
        status: "success",
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            profileImage: user.profileImage,
            role: user.role,
            lastActivity: user.lastActivity,
          },
        },
      });
    } catch (error) {
      logger.error(`사용자 정보 조회 실패: ${error.message}`);
      next(error);
    }
  }

  /**
   * 세션 검증
   * POST /api/v1/auth/validate-session
   */
  async validateSession(req, res, next) {
    try {
      const userId = req.user?.userId;
      const sessionId = req.headers["x-session-id"] || req.body.sessionId;

      if (!userId || !sessionId) {
        throw new AuthenticationError(
          "토큰 또는 세션 ID가 제공되지 않았습니다"
        );
      }

      logger.info(
        `세션 검증 시작 - userId: ${userId}, sessionId: ${sessionId}`
      );

      // MongoDB에서 세션 확인
      const session = await Session.findOne({
        _id: sessionId,
        userId,
      });

      if (!session) {
        throw new AuthenticationError("유효하지 않은 세션입니다");
      }

      // 세션 활성 시간 업데이트
      await Session.findByIdAndUpdate(
        sessionId,
        { lastActivity: new Date() },
        { new: true }
      );

      res.status(StatusCodes.OK).json({
        status: "success",
        message: "유효한 세션입니다",
      });
    } catch (error) {
      logger.error("세션 검증 실패:", {
        error: error.message,
        userId: req.user?.userId,
        sessionId: req.headers["x-session-id"] || req.body.sessionId,
      });

      if (error instanceof AuthenticationError) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          status: "error",
          message: error.message,
        });
      } else {
        next(error);
      }
    }
  }
}

module.exports = new AuthController();
