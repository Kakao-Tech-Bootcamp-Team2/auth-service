const userService = require('../../src/services/userService');
const { User } = require('../../src/models');
const { ValidationError, AuthenticationError } = require('../../src/utils/errors');
const redisClient = require('../../src/utils/redisClient');

describe('UserService', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const updatedUser = await userService.updateProfile(testUser._id, updateData);
      expect(updatedUser.name).toBe(updateData.name);
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
      const currentPassword = 'password123';
      const newPassword = 'newpassword123';

      await userService.changePassword(testUser._id, currentPassword, newPassword);

      const updatedUser = await User.findById(testUser._id).select('+password');
      const isNewPasswordValid = await updatedUser.comparePassword(newPassword);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should throw AuthenticationError for wrong current password', async () => {
      await expect(userService.changePassword(
        testUser._id,
        'wrongpassword',
        'newpassword123'
      )).rejects.toThrow(AuthenticationError);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      await userService.deleteAccount(testUser._id, 'password123');
      
      // 사용자가 실제로 삭제되었는지 확인
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should throw AuthenticationError for wrong password', async () => {
      await expect(userService.deleteAccount(
        testUser._id,
        'wrongpassword'
      )).rejects.toThrow(AuthenticationError);
      
      // 사용자가 여전히 존재하는지 확인
      const user = await User.findById(testUser._id);
      expect(user).not.toBeNull();
    });
  });
});