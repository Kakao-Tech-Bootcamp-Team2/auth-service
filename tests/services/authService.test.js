const authService = require('../../src/services/authService');
const { User, Session } = require('../../src/models');
const { AuthenticationError } = require('../../src/utils/errors');

describe('AuthService', () => {
  // 각 테스트 전에 데이터베이스 초기화
  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const user = await authService.register(userData);

      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.password).not.toBe(userData.password);
    });

    it('should throw ValidationError if email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      await authService.register(userData);
      await expect(authService.register(userData)).rejects.toThrow();
    });
  });

  describe('login', () => {
    let registeredUser;

    beforeEach(async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };
      registeredUser = await authService.register(userData);
    });

    it('should login user successfully', async () => {
      const result = await authService.login({
        email: registeredUser.email,
        password: 'password123',
        userAgent: 'test-agent',
        clientIp: '127.0.0.1'
      });

      expect(result.user.email).toBe(registeredUser.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw AuthenticationError for wrong password', async () => {
      await expect(
        authService.login({
          email: registeredUser.email,
          password: 'wrongpassword',
          userAgent: 'test-agent',
          clientIp: '127.0.0.1'
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  // 테스트가 끝난 후 데이터베이스 정리
  afterAll(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
  });
});