const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userAgent: String,
    clientIp: String,
    isValid: {
      type: Boolean,
      default: true,
      immutable: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    deviceInfo: {
      browser: String,
      os: String,
      device: String,
    },
    location: {
      ip: String,
      country: String,
      city: String,
    },
    loginHistory: [
      {
        timestamp: Date,
        action: String,
        ip: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 만료된 세션 자동 삭제를 위한 TTL 인덱스
sessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    background: true,
    name: "session_ttl",
  }
);

// 사용자별 세션 조회를 위한 인덱스
sessionSchema.index({ userId: 1 });

module.exports = mongoose.model("Session", sessionSchema);
