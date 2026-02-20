const loginController = require('../controllers/login')
const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')

const otpRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many OTP requests from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
})

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
})

router.route('/getOTP')
    .post(otpRequestLimiter, loginController.getOTP)

router.route('/login')
    .post(loginLimiter, loginController.loginUsingOTP)

module.exports = router
