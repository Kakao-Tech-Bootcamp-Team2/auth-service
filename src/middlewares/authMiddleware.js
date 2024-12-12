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
      const token = req.headers.authorization?.split(" ")[1];
      const sessionId = req.headers["x-session-id"] || req.body.sessionId;
      const userId = req.body.userId;

      // 토큰이 있는 경우에만 검증
      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwt.secret);
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            sessionId: sessionId,
          };
        } catch (error) {
          if (error.name === "TokenExpiredError") {
            next(new AuthenticationError("토큰이 만료되었습니다"));
            return;
          } else if (error.name === "JsonWebTokenError") {
            next(new AuthenticationError("유효하지 않은 토큰입니다"));
            return;
          }
          next(error);
          return;
        }
      } else {
        // 토큰이 없는 경우 body의 userId 사용
        req.user = {
          userId: userId,
          sessionId: sessionId,
        };
      }

      next();
    } catch (error) {
      logger.error("인증 미들웨어 오류:", {
        error: error.message,
        token: req.headers.authorization,
        sessionId: req.headers["x-session-id"] || req.body.sessionId,
        userId: req.body.userId,
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
