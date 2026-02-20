# email_otp_login

two apis

Some hosting services block transporter as it uses SMTP ports (465/587) for sending emails. In such cases, we use an HTTP-based email service like Resend, which sends emails over HTTPS (port 443) and works on all hosting platforms including Render.
YOu can use transporter to send emails


Hence, We are using Resend to send emails from sender email to users.
 
You need to set these environment variables in your .env file
Sender mail id is the email address of your choice from which the emails will be sent. This email address'domain SHOULD BE REGISTERED IN RESEND for it to work.

For JWT_SECRET, the recommendation is at least 256 bits (32 bytes), which means a random string of at least 64 hex characters (or 32+ random bytes encoded as base64/hex).

We use Mongo cloud database to save the receiver's email address, so we can use it in the future to verify with otp.

Once you register your domain with Resend, you can use the API key and paste it in the env.

If you do not register your domain, Resend uses 'onboarding@resend.dev' as a default email address from which emails will be sent.

NOTE, THIS IS ONLY FOR USING RESEND ON RENDER LIKE HOSTING SERVICES. For sending otps to email addresses normally you can use nodemailer as shown in the testEmailTransporter.js


Note, to test out this applicat
JWT_LIFETIME=30d
JWT_SECRET=
MONGO_URI=
GMAIL_PASSWORD=
RESEND_API_KEY=
SENDER_MAIL_ID=

You can test out both the resend version and the transporter version to send the emails.
Run the following commands in your terminal,
npm run testEmail your_test_email_address@gmail.com
npm run testEmailTransporter  your_test_email_address@gmail.com

## How the OTP is Created

1. **Generation** — A random 4-digit number (1000–9999) is generated using `Math.random()`.
2. **Hashing** — The OTP is hashed with **bcrypt** (10 salt rounds) before being stored in MongoDB, so the plain OTP is never saved to the database.
3. **Expiry** — Each OTP expires after **5 minutes**. The expiry timestamp is stored alongside the hash.
4. **Rate limiting** — A new OTP can only be requested once every **60 seconds** per email address.
5. **Verification** — On login, the submitted OTP is compared against the stored hash using `bcrypt.compare()`.
6. **One-time use** — Once used successfully, the OTP is marked as used and cannot be reused.
7. **Lockout** — After **5 consecutive wrong attempts**, the account is blocked for **1 hour**.

---
If you have registered your company domain with Resend
For sending mail as your company name,
in the process.env.SENDER_EMAIL= ABC_Company company_emailaddres@in

1.get otp
POST https://email-otp-login.onrender.com/getOTP
Requires 1 field in the body - "email"

2.login
POST https://email-otp-login.onrender.com/login
Requires 2 fields in the body - "email" and "otp"


