const userController = require('../../src/controllers/userController');
const userService = require('../../src/services/userService');
const { StatusCodes } = require('http-status-codes');
const { ValidationError, NotFoundError } = require('../../src/utils/errors');

jest.mock('../../src/services/userService');

describe('UserController', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            user: { userId: 'test-user-id' },
            body: {},
            session: { id: 'test-session-id' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            clearCookie: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('getProfile', () => {
        it('should return user profile successfully', async () => {
            const mockProfile = {
                _id: 'test-user-id',
                email: 'test@example.com',
                name: 'Test User'
            };

            userService.getProfile.mockResolvedValue(mockProfile);

            await userController.getProfile(mockReq, mockRes, mockNext);

            expect(userService.getProfile).toHaveBeenCalledWith(mockReq.user.userId);
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { profile: mockProfile }
            });
        });

        it('should handle getProfile error', async () => {
            const error = new NotFoundError('User not found');
            userService.getProfile.mockRejectedValue(error);

            await userController.getProfile(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateProfile', () => {
        it('should update profile successfully', async () => {
            const updateData = {
                name: 'Updated Name',
                email: 'updated@example.com'
            };
            mockReq.body = updateData;

            const mockUpdatedProfile = {
                _id: 'test-user-id',
                ...updateData
            };

            userService.updateProfile.mockResolvedValue(mockUpdatedProfile);

            await userController.updateProfile(mockReq, mockRes, mockNext);

            expect(userService.updateProfile).toHaveBeenCalledWith(mockReq.user.userId, updateData);
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { profile: mockUpdatedProfile }
            });
        });

        it('should handle updateProfile error', async () => {
            const error = new ValidationError('Invalid email format');
            userService.updateProfile.mockRejectedValue(error);

            await userController.updateProfile(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const passwordData = {
                currentPassword: 'oldpass',
                newPassword: 'newpass'
            };
            mockReq.body = passwordData;

            userService.changePassword.mockResolvedValue({ message: 'Password changed' });

            await userController.changePassword(mockReq, mockRes, mockNext);

            expect(userService.changePassword).toHaveBeenCalledWith(
                mockReq.user.userId,
                passwordData
            );
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Password successfully changed'
            });
        });

        it('should handle changePassword error', async () => {
            const error = new ValidationError('Current password is incorrect');
            userService.changePassword.mockRejectedValue(error);

            await userController.changePassword(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getActiveSessions', () => {
        it('should return active sessions successfully', async () => {
            const mockSessions = [
                {
                    id: 'session-1',
                    userAgent: 'Chrome',
                    lastActivity: new Date()
                }
            ];

            userService.getActiveSessions.mockResolvedValue(mockSessions);

            await userController.getActiveSessions(mockReq, mockRes, mockNext);

            expect(userService.getActiveSessions).toHaveBeenCalledWith(mockReq.user.userId);
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { sessions: mockSessions }
            });
        });

        it('should handle getActiveSessions error', async () => {
            const error = new Error('Failed to fetch sessions');
            userService.getActiveSessions.mockRejectedValue(error);

            await userController.getActiveSessions(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('logoutOtherSessions', () => {
        it('should logout other sessions successfully', async () => {
            userService.logoutOtherSessions.mockResolvedValue();

            await userController.logoutOtherSessions(mockReq, mockRes, mockNext);

            expect(userService.logoutOtherSessions).toHaveBeenCalledWith(
                mockReq.user.userId,
                mockReq.session.id
            );
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Successfully logged out from other sessions'
            });
        });

        it('should handle logoutOtherSessions error', async () => {
            const error = new Error('Failed to logout other sessions');
            userService.logoutOtherSessions.mockRejectedValue(error);

            await userController.logoutOtherSessions(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('deleteAccount', () => {
        it('should delete account successfully', async () => {
            mockReq.body = { password: 'password123' };

            userService.deleteAccount.mockResolvedValue();

            await userController.deleteAccount(mockReq, mockRes, mockNext);

            expect(userService.deleteAccount).toHaveBeenCalledWith(
                mockReq.user.userId,
                mockReq.body.password
            );
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Account successfully deleted'
            });
        });

        it('should handle deleteAccount error', async () => {
            const error = new ValidationError('Incorrect password');
            userService.deleteAccount.mockRejectedValue(error);

            await userController.deleteAccount(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
}); 