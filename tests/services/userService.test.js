const userService = require('../../src/services/userService');
const { User, Session } = require('../../src/models');
const redisClient = require('../../src/utils/redisClient');
const { ValidationError, NotFoundError, AuthenticationError } = require('../../src/utils/errors');

describe('UserService', () => {
    let testUser;

    beforeEach(async () => {
        await User.deleteMany({});
        await Session.deleteMany({});
        jest.clearAllMocks();

        testUser = await User.create({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const profile = await userService.getProfile(testUser._id);
            
            expect(profile.email).toBe(testUser.email);
            expect(profile.name).toBe(testUser.name);
            expect(profile.password).toBeUndefined();
        });

        it('should throw NotFoundError for non-existent user', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            await expect(userService.getProfile(fakeId))
                .rejects
                .toThrow(NotFoundError);
        });
    });

    describe('updateProfile', () => {
        it('should update profile successfully', async () => {
            const updateData = {
                name: 'Updated Name',
                email: 'updated@example.com'
            };

            const updatedProfile = await userService.updateProfile(testUser._id, updateData);

            expect(updatedProfile.name).toBe(updateData.name);
            expect(updatedProfile.email).toBe(updateData.email);
        });

        it('should throw ValidationError for duplicate email', async () => {
            await User.create({
                email: 'other@example.com',
                password: 'password123',
                name: 'Other User'
            });

            await expect(userService.updateProfile(testUser._id, {
                email: 'other@example.com'
            })).rejects.toThrow(ValidationError);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const passwordData = {
                currentPassword: 'password123',
                newPassword: 'newpassword123'
            };

            await userService.changePassword(testUser._id, passwordData);

            const updatedUser = await User.findById(testUser._id).select('+password');
            const isNewPasswordValid = await updatedUser.comparePassword(passwordData.newPassword);
            expect(isNewPasswordValid).toBe(true);
        });

        it('should throw AuthenticationError for wrong password', async () => {
            const passwordData = {
                currentPassword: 'wrongpassword',
                newPassword: 'newpassword123'
            };

            await expect(userService.changePassword(testUser._id, passwordData))
                .rejects
                .toThrow(AuthenticationError);
        });
    });

    describe('deleteAccount', () => {
        it('should delete account successfully', async () => {
            await userService.deleteAccount(testUser._id, 'password123');
            
            const deletedUser = await User.findById(testUser._id);
            expect(deletedUser).toBeNull();
        });

        it('should throw AuthenticationError for wrong password', async () => {
            await expect(userService.deleteAccount(testUser._id, 'wrongpassword'))
                .rejects
                .toThrow(AuthenticationError);
        });
    });
});
