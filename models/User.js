const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('User', userSchema)