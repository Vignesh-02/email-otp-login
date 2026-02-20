require('dotenv').config()
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const toEmail = process.argv[2]

if (!toEmail) {
    console.error('Usage: node testEmail.js <email>')
    process.exit(1)
}

const sendTestEmail = async () => {
    const { data, error } = await resend.emails.send({
        from: process.env.SENDER_MAIL_ID,
        to: toEmail,
        subject: 'Test Email',
        text: 'This is a test email sent via Resend.'
    })

    if (error) {
        console.error('Failed to send email:', error)
    } else {
        console.log('Email sent successfully:', data)
    }
}

sendTestEmail()


// node testEmail.js someone@example.com
// email gets sent to someone@example.com