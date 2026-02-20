# Email OTP Login

A Node.js REST API that authenticates users via a one-time password (OTP) sent to their email address.

## API Endpoints

### 1. Get OTP
**POST** `https://email-otp-login.onrender.com/getOTP`

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

### 2. Login
**POST** `https://email-otp-login.onrender.com/login`

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `otp` | string | Yes |

---

## How the OTP is Created

1. **Generation** — A random 4-digit number (1000–9999) is generated using `Math.random()`.
2. **Hashing** — The OTP is hashed with **bcrypt** (10 salt rounds) before being stored in MongoDB, so the plain OTP is never saved to the database.
3. **Expiry** — Each OTP expires after **5 minutes**.
4. **Rate limiting** — A new OTP can only be requested once every **60 seconds** per email address.
5. **Verification** — On login, the submitted OTP is compared against the stored hash using `bcrypt.compare()`.
6. **One-time use** — Once used successfully, the OTP is marked as used and cannot be reused.
7. **Lockout** — After **5 consecutive wrong attempts**, the account is blocked for **1 hour**.

---

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

```
JWT_LIFETIME=30d
JWT_SECRET=
MONGO_URI=
GMAIL_PASSWORD=
RESEND_API_KEY=
SENDER_MAIL_ID=
```

- **`JWT_SECRET`** — Use a random string of at least 64 hex characters (256 bits). Generate one with: `openssl rand -hex 32`
- **`MONGO_URI`** — MongoDB connection string. The database stores email addresses and OTP records.
- **`SENDER_MAIL_ID`** — The email address emails are sent from. The domain must be registered in Resend.
- **`RESEND_API_KEY`** — Your Resend API key.
- **`GMAIL_PASSWORD`** — App password for your Gmail account (used with Nodemailer for local testing).

---

## Email Sending

This project supports two ways to send emails:

### Resend (recommended for production)

Some hosting services (e.g. Render) block SMTP ports (465/587). Resend sends email over HTTPS (port 443), which works on all hosting platforms.

- You must register your domain with Resend for it to send from your address.
- If your domain is not registered, Resend falls back to `onboarding@resend.dev` (only delivers to your own account email).
- To send as your company name: set `SENDER_MAIL_ID` to `Company Name <you@yourdomain.com>`

### Nodemailer (for local testing)

Uses Gmail's SMTP. Suitable for development and testing only.

> **Note:** Gmail has a limit of 500 emails per day.

---

## Testing Email Sending

You can test both email methods from the terminal:

```bash
# Test via Resend
npm run testEmail your_test_email@gmail.com

# Test via Nodemailer (Gmail SMTP)
npm run testEmailTransporter your_test_email@gmail.com
```
