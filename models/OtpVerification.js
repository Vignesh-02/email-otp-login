const mongoose = require('mongoose')

const otpVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
       type: String,
       required: true

    },
    used: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        default: null
    },
    lastOTPGenerationTime: {
        type: Date,
        default: null
    },
    consecutiveWrongAttempts: {
        type: Number,
        default: 0,
    },
    blockedUntil: {
        type: Date,
        default: null
    }

})


module.exports = mongoose.model('OTPVerification', otpVerificationSchema)