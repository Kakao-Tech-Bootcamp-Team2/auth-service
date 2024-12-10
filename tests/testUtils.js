const jwt = require('jsonwebtoken');
const config = require('../src/config');

const generateTestToken = (userId, role = 'user') => {
    return jwt.sign(
        { userId, role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiresIn }
    );
};

module.exports = {
    generateTestToken
}; 