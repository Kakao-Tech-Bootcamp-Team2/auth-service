const authService = require('../../src/services/authService');
const { User, Session } = require('../../src/models');
const redisClient = require('../../src/utils/redisClient');
const { AuthenticationError, ValidationError } = require('../../src/utils/errors');

describe('AuthService', () => {
    beforeEach(async () => {
        await User.deleteMany({});
        await Session.deleteMany({});
        jest.clearAllMocks();
    });

    describe('register', () => {
        const validUserData = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        };

        it('should register a new user successfully', async () => {
            const user = await authService.register(validUserData);

            expect(user.email).toBe(validUserData.email);
            expect(user.name).toBe(validUserData.name);
            expect(user.password).not.toBe(validUserData.password);
            expect(user.status).toBe('active');
        });

        it('should throw ValidationError for duplicate email', async () => {
            await authService.register(validUserData);
            await expect(authService.register(validUserData))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('login', () => {
        const userData = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        };

        beforeEach(async () => {
            await authService.register(userData);
        });

        it('should login successfully and return tokens', async () => {
            const result = await authService.login({
                email: userData.email,
                password: userData.password,
                userAgent: 'test-agent',
                clientIp: '127.0.0.1'
            });

            expect(result.user.email).toBe(userData.email);
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.sessionId).toBeDefined();
            expect(redisClient.setex).toHaveBeenCalled();
        });

        it('should throw AuthenticationError for wrong password', async () => {
            await expect(authService.login({
                email: userData.email,
                password: 'wrongpassword',
                userAgent: 'test-agent',
                clientIp: '127.0.0.1'
            })).rejects.toThrow(AuthenticationError);
        });
    });

    describe('logout', () => {
        let user;
        let session;

        beforeEach(async () => {
            user = await authService.register({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            });

            const loginResult = await authService.login({
                email: 'test@example.com',
                password: 'password123',
                userAgent: 'test-agent',
                clientIp: '127.0.0.1'
            });

            session = await Session.findById(loginResult.sessionId);
        });

        it('should logout successfully', async () => {
            await authService.logout(user._id, session._id);

            const updatedSession = await Session.findById(session._id);
            expect(updatedSession.isValid).toBe(false);
            expect(redisClient.del).toHaveBeenCalledWith(`session:${user._id}:${session._id}`);
        });
    });
});
