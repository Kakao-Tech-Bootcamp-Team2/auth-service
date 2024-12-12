const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const config = require("../config");
const logger = require("../utils/logger");
const redisClient = require("../utils/redisClient");
const { AuthenticationError } = require("../utils/errors");

class AuthMiddleware {
  // JWT 토큰 검증 미들웨어
  async verifyToken(req, res, next) {
    try {
      const token =
        req.headers.authorization?.split(" ")[1] || req.headers["x-auth-token"];
      const sessionId = req.headers["x-session-id"] || req.body.sessionId;

      if (!token) {
        throw new AuthenticationError("인증 토큰이 제공되지 않았습니다");
      }

      try {
        const decoded = jwt.verify(token, config.jwt.secret);

        // userId를 올바르게 설정
        req.user = {
          userId: decoded.userId || decoded.id, // id로도 확인
          email: decoded.email,
          role: decoded.role,
          sessionId: sessionId,
        };

        logger.info(`토큰 검증 성공:`, {
          userId: req.user.userId,
          email: req.user.email,
          sessionId: sessionId,
        });

        next();
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          next(new AuthenticationError("토큰이 만료되었습니다"));
        } else if (error.name === "JsonWebTokenError") {
          next(new AuthenticationError("유효하지 않은 토큰입니다"));
        } else {
          next(error);
        }
      }
    } catch (error) {
      logger.error("인증 미들웨어 오류:", {
        error: error.message,
        token: req.headers.authorization,
        sessionId: req.headers["x-session-id"] || req.body.sessionId,
      });
      next(error);
    }
  }

  // 권한 체크 미들웨어
  checkRole(requiredRole) {
    return async (req, res, next) => {
      try {
        const { userId } = req.user;
        const userRole = await redisClient.get(`role_${userId}`);

        if (!userRole || userRole !== requiredRole) {
          throw new AuthenticationError("Insufficient permissions");
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
        throw new AuthenticationError("Account is already logged in elsewhere");
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthMiddleware();
