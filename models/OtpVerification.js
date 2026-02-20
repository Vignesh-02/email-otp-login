const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

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
    lastOTPGenerationTime: {
        type: Date,
        default: null
    },
    consecutiveWrongAttempts: {
        type: Number,
        default: 0,
    },
    verified: {
        type: Boolean,
        default: false
    },
    blockedUntil: {
        type: Date,
        default: null
    }

})

otpVerificationSchema.methods.createJWT =async function(){
    return await jwt.sign({ userId: this._id, email: this.email },
        process.env.JWT_SECRET, { expiresIn: process.env.JWT_LIFETIME })

}

module.exports = mongoose.model('OTPVerification', otpVerificationSchema)