require('dotenv').config()
const User = require('../models/User')
const OtpVerification = require('../models/OtpVerification')
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const bcrypt = require('bcryptjs')

const generateOTP = async (email) => {
    const value = await OtpVerification.findOne({ email })
    let lastOTPGenerationTime = value ? value.lastOTPGenerationTime : null
    const currentTime = new Date().getTime();
    const timeElapsed = lastOTPGenerationTime ? currentTime - lastOTPGenerationTime : Infinity;

if (timeElapsed >= 60000) {
    const otp = Math.floor(1000 + Math.random() * 9000)

    const saltRounds = 10

    const hashedOTP = await bcrypt.hash(`${otp}`, saltRounds)
    const id = value ? value._id : null
    if(id){
        const updateOTP = await  OtpVerification.findByIdAndUpdate(id, {
            otp: hashedOTP ,
            used: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000,
            lastOTPGenerationTime: Date.now()
        }, { new: false })
    }
    else{

        const newOTP = await new OtpVerification({
            email,
            otp: hashedOTP ,
            used: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000,
            lastOTPGenerationTime: Date.now()
        })
        await newOTP.save()
    }

    const { error: mailError } = await resend.emails.send({
        from: `My Company <${process.env.SENDER_MAIL_ID}>`,
        to: email,
        subject: 'otp',
        text: `Your otp for secure login is ${otp}. The otp expires in 5 minutes`
    });

    if (mailError) {
        console.log(mailError);
    } else {
        console.log('Email sent');
    }
}
else{
    throw new Error("Wait for a minute to get new otp")
}
}



const getOTP = async (req,res) => {
    const { email } = req.body    

    const validateEmail = (email) => {
        const validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
        return String(email)
        .toLowerCase()
        .match(validRegex);
    }
    if(!validateEmail(email)){
        return res.status(400).json({ error: "Invalid email provided "})
    }

    try{
        const saveEmail =  await User.create({email})
        await generateOTP(email)
        return res.status(201).json({ success: "User email saved and otp sent successfully "})
    }catch(err){
        return res.status(400).json({error: err.message})
    }
}

const loginUsingOTP = async (req,res) => {
    const {otp, email} = req.body
    if(!email || !otp){
        res.status(400).json({error: "Please enter both email and otp "})
    }
    const otpVerificationRecord = await OtpVerification.findOne({ email })
    if(!otpVerificationRecord){
        return res.status(400).json({ error: "This account does not exist or has been verified. Try again "})
    }

    const { blockedUntil, expiresAt, otp: hashedOTP, used, verified, consecutiveWrongAttempts } = otpVerificationRecord;
    
    if (blockedUntil && blockedUntil > Date.now()) {
        // User is blocked, prevent login attempt
        const timeRemaining = blockedUntil - Date.now();
        const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
        return res.status(400).json({ error:`Your account is blocked. Please try again after ${minutesRemaining} minutes.`})
      }


    if( expiresAt < Date.now()){
        await OtpVerification.deleteOne({ email })
        return res.status(400).json({error: "The otp has expired please enter a new otp"})
    }

    const validOTP = await bcrypt.compare(otp, hashedOTP)

    if(used){
        return res.status(400).json({error: "This otp has been used already. Ask for a new otp"})
    }
    if (validOTP && !used) {
        otpVerificationRecord.used = true
        otpVerificationRecord.consecutiveWrongAttempts = 0;
        otpVerificationRecord.verified = true
        await otpVerificationRecord.save()
        const token = await otpVerificationRecord.createJWT()
        return res.status(200).json({ success: "You have successfully logged in. ", token})
      } else {
        otpVerificationRecord.consecutiveWrongAttempts++;
        const MAX_CONSECUTIVE_WRONG_ATTEMPTS = 5;
        const BLOCK_DURATION = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

        if (otpVerificationRecord.consecutiveWrongAttempts >= MAX_CONSECUTIVE_WRONG_ATTEMPTS) {
            otpVerificationRecord.blockedUntil = new Date(Date.now() + BLOCK_DURATION);
        }
        await otpVerificationRecord.save()
        return res.status(400).json({ error: "You have entered a wrong otp. Try again "})
      }



}

module.exports = {
    getOTP, loginUsingOTP
}