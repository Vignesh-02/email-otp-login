require('dotenv').config()

const toEmail = process.argv[2]

if (!toEmail) {
    console.error('Usage: node testEmailTransporter.js <email>')
    process.exit(1)
}

async function sendTestEmail() {
    const { default: nodemailer } = await import('nodemailer')

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SENDER_MAIL_ID,
            pass: process.env.GMAIL_PASSWORD
        }
    })

    const mailOptions = {
        from: process.env.SENDER_MAIL_ID,
        to: toEmail,
        subject: 'Test Email',
        text: 'This is a test email sent via nodemailer transporter.'
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent successfully:', info.response)
    } catch (error) {
        console.error('Failed to send email:', error)
    }
}

sendTestEmail()



// node testEmailTransporter.js someone@example.com
// email gets sent to someone@example.com
