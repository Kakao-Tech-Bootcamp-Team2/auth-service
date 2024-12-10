const Joi = require('joi');

const schemas = {
    // 회원가입 스키마
    registerSchema: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        name: Joi.string().min(2).max(50).required()
    }),

    // 로그인 스키마
    loginSchema: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    // 프로필 업데이트 스키마
    updateProfileSchema: Joi.object({
        name: Joi.string().min(2).max(50),
        email: Joi.string().email()
    }),

    // 비밀번호 변경 스키마
    changePasswordSchema: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).required()
    }),

    // 비밀번호 초기화 스키마
    resetPasswordSchema: Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string().min(8).required()
    }),

    // 프로필 이미지 업데이트 스키마
    updateProfileImageSchema: Joi.object({
        imageUrl: Joi.string().uri().required()
    })
};

module.exports = schemas;