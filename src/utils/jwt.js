const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError } = require('./errors');

class JwtUtil {
    /**
     * Access Token 생성
     */
    generateAccessToken(payload) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.accessExpiresIn
        });
    }

    /**
     * Refresh Token 생성
     */
    generateRefreshToken(payload) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.refreshExpiresIn
        });
    }

    /**
     * Token 검증
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError('Token has expired');
            }
            throw new AuthenticationError('Invalid token');
        }
    }
}

module.exports = new JwtUtil();