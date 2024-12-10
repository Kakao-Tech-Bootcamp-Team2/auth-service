const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');
const { 
    ValidationError, 
    AuthenticationError, 
    NotFoundError 
} = require('../utils/errors');

class ErrorHandler {
    // 전역 에러 핸들러
    handle(err, req, res, next) {
        logger.error('Error:', {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });

        // 커스텀 에러 처리
        if (err instanceof ValidationError) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                error: {
                    type: 'ValidationError',
                    message: err.message
                }
            });
        }

        if (err instanceof AuthenticationError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                status: 'error',
                error: {
                    type: 'AuthenticationError',
                    message: err.message
                }
            });
        }

        if (err instanceof NotFoundError) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: 'error',
                error: {
                    type: 'NotFoundError',
                    message: err.message
                }
            });
        }

        // 기본 에러 응답
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            error: {
                type: 'InternalServerError',
                message: process.env.NODE_ENV === 'production' 
                    ? 'Internal server error' 
                    : err.message
            }
        });
    }

    // 404 Not Found 핸들러
    notFound(req, res) {
        res.status(StatusCodes.NOT_FOUND).json({
            status: 'error',
            error: {
                type: 'NotFoundError',
                message: 'Resource not found'
            }
        });
    }

    // 비동기 에러 래퍼
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

module.exports = new ErrorHandler();