const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    clientIp: {
        type: String,
        required: true
    },
    isValid: {
        type: Boolean,
        default: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// 만료된 세션 자동 삭제를 위한 TTL 인덱스
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 사용자별 세션 조회를 위한 인덱스
sessionSchema.index({ userId: 1, isValid: 1 });

// 세션 업데이트 메서드
sessionSchema.methods.updateActivity = function() {
    this.lastActivity = Date.now();
    return this.save();
};

// 세션 무효화 메서드
sessionSchema.methods.invalidate = async function() {
    return await this.model('Session').findByIdAndUpdate(
        this._id,
        { isValid: false },
        { new: true }
    );
};

// 활성 세션 조회를 위한 정적 메서드
sessionSchema.statics.getActiveSessions = function(userId) {
    return this.find({
        userId,
        isValid: true,
        expiresAt: { $gt: Date.now() }
    }).sort({ lastActivity: -1 });
};

module.exports = mongoose.model('Session', sessionSchema);