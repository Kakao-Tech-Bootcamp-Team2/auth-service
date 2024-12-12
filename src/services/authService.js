const jwt = require("jsonwebtoken");
const { User, Session } = require("../models");
const redisClient = require("../utils/redisClient");
const logger = require("../utils/logger");
const config = require("../config");
const userService = require("./userService");
const {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} = require("../utils/errors");
const ms = require("ms");

// 7일을 밀리초로 변환 (상수로 정의)
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

class AuthService {
  /**
   * 회원가입
   */
  async register(userData) {
    try {
      const { email, password, name } = userData;

      // 단일 쿼리로 사용자 생성 (unique 인덱스로 중복 방지)
      const user = new User({
        email,
        password,
        name,
      });

      // 사용자 저장과 세션 생성을 병렬로 처리
      const [savedUser, session] = await Promise.all([
        user.save(),
        Session.create({
          userId: user._id,
          userAgent: userData.userAgent || "Unknown",
          clientIp: userData.clientIp || "Unknown",
          expiresAt: new Date(Date.now() + SEVEN_DAYS_IN_MS), // 7일로 고정
          isValid: true,
          lastActivity: new Date(),
        }),
      ]);

      // 토큰 생성을 병렬로 처리
      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(savedUser),
        this.generateRefreshToken(savedUser),
      ]);

      return {
        user: {
          _id: savedUser._id,
          email: savedUser.email,
          name: savedUser.name,
          profileImage: savedUser.profileImage,
        },
        accessToken,
        refreshToken,
        sessionId: session._id,
      };
    } catch (error) {
      // MongoDB 중복 키 에러 처리
      if (error.code === 11000) {
        throw new ValidationError("이미 등록된 이메일입니다.");
      }
      throw error;
    }
  }

  /**
   * 로그인
   */
  async login(loginData) {
    const { email, password, userAgent, clientIp } = loginData;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AuthenticationError("이메일 또는 비밀번호가 잘못되었습니다.");
    }

    // 계정 금 확인
    if (user.lockUntil && user.lockUntil > Date.now()) {
      throw new AuthenticationError(
        "계정이 일시적으로 잠겼습니다. 잠시 후 다시 시도해주세요."
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw new AuthenticationError("이메일 또는 비밀번호가 잘못되었습니다.");
    }

    // 로그인 성공시 초기화
    await user.resetLoginAttempts();

    // 세션 생성
    const session = await Session.create({
      userId: user._id,
      userAgent,
      clientIp,
      expiresAt: new Date(Date.now() + SEVEN_DAYS_IN_MS),
      isValid: true,
      lastActivity: new Date(),
    });

    // 세션 상세 정보 로깅
    logger.info("Session details:", {
      sessionId: session._id,
      isValid: session.isValid,
      expiresAt: session.expiresAt,
      currentTime: new Date(),
      operation: "create",
    });

    // 세션 검증 (findOneAndUpdate 대신 findById 사용)
    const verifySession = await Session.findById(session._id);
    if (verifySession) {
      logger.info("Session verification:", {
        id: verifySession._id,
        isValid: verifySession.isValid,
      });
    } else {
      logger.warn("Session verification failed: Session not found");
    }

    // 디바이스 정보 업데이트
    await User.findByIdAndUpdate(
      user._id,
      {
        $push: {
          devices: {
            deviceId: session._id,
            userAgent,
            lastLogin: new Date(),
            isActive: true,
          },
        },
        lastActivity: new Date(),
      },
      { new: true }
    );

    // 토큰 생성
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
      },
      accessToken,
      refreshToken,
      sessionId: session._id,
    };
  }

  /**
   * 로그아웃
   */
  async logout(userId, sessionId) {
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
    // 리레시 토큰 검증
    const decoded = jwt.verify(refreshToken, config.jwt.secret);

    // 세션 확인
    const session = await Session.findOne({
      _id: sessionId,
      userId: decoded.userId,
      token: refreshToken,
      isValid: true,
    });

    if (!session) {
      throw new AuthenticationError("Invalid refresh token");
    }

    // 사용자 확인
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== "active") {
      throw new AuthenticationError("User not found or inactive");
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
      throw new NotFoundError("User not found");
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
        name: user.name,
        email: user.email,
        role: user.role,
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
        userId: user._id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }
}

module.exports = new AuthService();
