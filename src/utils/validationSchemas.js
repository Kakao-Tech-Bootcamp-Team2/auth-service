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
    }).min(1),

    // 비밀번호 변경 스키마
    changePasswordSchema: Joi.object({
        currentPassword: Joi.string()
            .required()
            .min(8)
            .messages({
                'string.empty': '현재 비밀번호를 입력해주세요.',
                'string.min': '비밀번호는 최소 8자 이상이어야 합니다.'
            }),
        newPassword: Joi.string()
            .required()
            .min(8)
            .messages({
                'string.empty': '새 비밀번호를 입력해주세요.',
                'string.min': '비밀번호는 최소 8자 이상이어야 합니다.'
            })
    }),

    // 비밀번호 초기화 스키마
    resetPasswordSchema: Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string().min(8).required()
    }),

    deleteAccountSchema: Joi.object({
        password: Joi.string().required()
    })
};

module.exports = schemas;