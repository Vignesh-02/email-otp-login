const loginController = require('../controllers/login')
const express = require('express')
const router = express.Router()

router.route('/getOTP')
    .post(loginController.getOTP)

router.route('/login')
    .post(loginController.loginUsingOTP)

module.exports = router