const authController = require('../../src/controllers/authController');
const authService = require('../../src/services/authService');
const { StatusCodes } = require('http-status-codes');
const { AuthenticationError, ValidationError } = require('../../src/utils/errors');

jest.mock('../../src/services/authService');

describe('AuthController', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            body: {},
            user: { userId: 'test-user-id' },
            cookies: { sessionId: 'test-session-id' },
            headers: {
                'user-agent': 'test-agent'
            },
            ip: '127.0.0.1'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn(),
            clearCookie: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('register', () => {
        const userData = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        };

        it('should register user successfully', async () => {
            mockReq.body = userData;
            const mockUser = {
                _id: 'user-id',
                email: userData.email,
                name: userData.name
            };

            authService.register.mockResolvedValue({ user: mockUser });

            await authController.register(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    user: {
                        id: mockUser._id,
                        email: mockUser.email,
                        name: mockUser.name
                    }
                }
            });
        });

        it('should handle registration error', async () => {
            mockReq.body = userData;
            const error = new ValidationError('Email already exists');
            authService.register.mockRejectedValue(error);

            await authController.register(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('login', () => {
        const loginData = {
            email: 'test@example.com',
            password: 'password123'
        };

        it('should login user successfully', async () => {
            mockReq.body = loginData;
            const mockLoginResult = {
                user: {
                    _id: 'user-id',
                    email: loginData.email,
                    name: 'Test User'
                },
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                sessionId: 'session-id'
            };

            authService.login.mockResolvedValue(mockLoginResult);

            await authController.login(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.cookie).toHaveBeenCalledWith(
                'sessionId',
                mockLoginResult.sessionId,
                expect.any(Object)
            );
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    accessToken: mockLoginResult.accessToken,
                    refreshToken: mockLoginResult.refreshToken,
                    user: {
                        id: mockLoginResult.user._id,
                        email: mockLoginResult.user.email,
                        name: mockLoginResult.user.name
                    }
                }
            });
        });

        it('should handle login error', async () => {
            mockReq.body = loginData;
            const error = new AuthenticationError('Invalid credentials');
            authService.login.mockRejectedValue(error);

            await authController.login(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('logout', () => {
        it('should logout user successfully', async () => {
            await authController.logout(mockReq, mockRes, mockNext);

            expect(authService.logout).toHaveBeenCalledWith(
                mockReq.user.userId,
                mockReq.cookies.sessionId
            );
            expect(mockRes.clearCookie).toHaveBeenCalledWith('sessionId');
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                message: '로그아웃되었습니다.'
            });
        });

        it('should handle logout error', async () => {
            const error = new Error('Logout failed');
            authService.logout.mockRejectedValue(error);

            await authController.logout(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const mockRefreshData = {
                refreshToken: 'refresh-token',
            };
            mockReq.body = mockRefreshData;
            
            const mockResult = {
                accessToken: 'new-access-token'
            };
            authService.refreshToken.mockResolvedValue(mockResult);

            await authController.refreshToken(mockReq, mockRes, mockNext);

            expect(authService.refreshToken).toHaveBeenCalledWith(
                mockRefreshData.refreshToken,
                mockReq.cookies.sessionId
            );
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    accessToken: mockResult.accessToken
                }
            });
        });

        it('should handle refresh token error', async () => {
            mockReq.body = { refreshToken: 'invalid-token' };
            const error = new AuthenticationError('Invalid refresh token');
            authService.refreshToken.mockRejectedValue(error);

            await authController.refreshToken(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getCurrentUser', () => {
        it('should get current user successfully', async () => {
            const mockUser = {
                _id: 'user-id',
                email: 'test@example.com',
                name: 'Test User',
                profileImage: 'image-url'
            };
            authService.getCurrentUser.mockResolvedValue(mockUser);

            await authController.getCurrentUser(mockReq, mockRes, mockNext);

            expect(authService.getCurrentUser).toHaveBeenCalledWith(mockReq.user.userId);
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    user: {
                        id: mockUser._id,
                        email: mockUser.email,
                        name: mockUser.name,
                        profileImage: mockUser.profileImage
                    }
                }
            });
        });

        it('should handle getCurrentUser error', async () => {
            const error = new Error('User not found');
            authService.getCurrentUser.mockRejectedValue(error);

            await authController.getCurrentUser(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});