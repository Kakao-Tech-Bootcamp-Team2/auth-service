const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, '이메일은 필수입니다.'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: '유효한 이메일 주소를 입력해주세요.'
        }
    },
    password: {
        type: String,
        required: [true, '비밀번호는 필수입니다.'],
        minlength: [8, '비밀번호는 최소 8자 이상이어야 합니다.'],
        select: false // 기본적으로 조회 시 비밀번호 필드 제외
    },
    name: {
        type: String,
        required: [true, '이름은 필수입니다.'],
        trim: true,
        minlength: [2, '이름은 최소 2자 이상이어야 합니다.'],
        maxlength: [50, '이름은 최대 50자까지 가능합니다.']
    },
    profileImage: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastActivity: {
        type: Date,
        default: Date.now
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    devices: [{
        deviceId: String,
        userAgent: String,
        lastLogin: Date,
        isActive: Boolean
    }],
    settings: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        twoFactorAuth: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true, // createdAt, updatedAt 자동 생성
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
    // 비밀번호가 수정되지 않았다면 다음 미들웨어로
    if (!this.isModified('password')) return next();
    
    try {
        // 비밀번호 해싱
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        
        // 비밀번호가 변경되었다면 변경 시간 업데이트
        if (this.isModified('password')) {
            this.passwordChangedAt = Date.now() - 1000;
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 비밀번호 변경 후 토큰 발급 여부 확인
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// 비밀번호 초기화 토큰 생성
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10분
    
    return resetToken;
};

// 로그인 시도 관리를 위한 메서드 추가
userSchema.methods.incLoginAttempts = async function() {
    // 락이 걸려있고 아직 시간이 안지났다면
    if (this.lockUntil && this.lockUntil > Date.now()) {
        return;
    }
    
    // 로그인 시도 횟수 증가
    const updates = { $inc: { loginAttempts: 1 } };
    
    // 5회 이상 실패시 30분 락
    if (this.loginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

// 로그인 성공시 초기화
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

module.exports = mongoose.model('User', userSchema);