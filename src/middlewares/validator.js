const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

class Validator {
    // 요청 본문 검증
    validateBody(schema) {
        return (req, res, next) => {
            const { error } = schema.validate(req.body);
            if (error) {
                throw new ValidationError(error.details[0].message);
            }
            next();
        };
    }

    // 요청 파라미터 검증
    validateParams(schema) {
        return (req, res, next) => {
            const { error } = schema.validate(req.params);
            if (error) {
                throw new ValidationError(error.details[0].message);
            }
            next();
        };
    }

    // 요청 쿼리 검증
    validateQuery(schema) {
        return (req, res, next) => {
            const { error } = schema.validate(req.query);
            if (error) {
                throw new ValidationError(error.details[0].message);
            }
            next();
        };
    }
}

module.exports = new Validator();