# Project Flow Documentation

## Overview

This project authenticates users using a one-time password (OTP) sent to their email via [Resend](https://resend.com). There are two endpoints: one to request an OTP, and one to verify it and receive a JWT token.

---

## Flow 1 — Requesting an OTP (`POST /getOTP`)

```
Client  →  POST /getOTP { email }
              │
              ▼
        IP rate limit check (5 requests / 15 min per IP)
              │
              ▼
        Validate email format (regex)
              │
              ▼
        Upsert User record in MongoDB (create if new, skip if exists)
              │
              ▼
        Look up OtpVerification record for this email in MongoDB
              │
        ┌─────┴──────┐
    Record          No record
    exists          yet
        │               │
        ▼               ▼
  Check time       Generate OTP
  since last       immediately
  OTP request
        │
   < 60 seconds → reject with error
   ≥ 60 seconds → generate new OTP
              │
              ▼
        Generate 4-digit OTP (Math.random, range 1000–9999)
              │
              ▼
        Hash OTP with bcryptjs (10 salt rounds)
              │
              ▼
        Save/update OtpVerification record in MongoDB:
          - otp: <hashed>
          - used: false
          - expiresAt: now + 5 minutes
          - lastOTPGenerationTime: now
          - consecutiveWrongAttempts: 0   ← reset on new OTP
          - blockedUntil: null            ← reset on new OTP
              │
              ▼
        Send email via Resend API
          - from: "Company Name <SENDER_MAIL_ID>"
          - to: user's email
          - text: OTP + expiry notice
              │
        ┌─────┴──────┐
    Mail sent     Mail failed
        │               │
        ▼               ▼
   Respond 201    Throw error → respond 400
  "OTP sent"     "Failed to send OTP email"
```

---

## Flow 2 — Verifying OTP and Logging In (`POST /login`)

```
Client  →  POST /login { email, otp }
              │
              ▼
        IP rate limit check (10 requests / 15 min per IP)
              │
              ▼
        Validate email + otp fields present
              │
              ▼
        Look up OtpVerification record by email in MongoDB
              │
        Not found → 400 "No OTP was requested for this email"
              │
              ▼
        Check if account is blocked (blockedUntil > now)
              │
        Blocked → 400 with minutes remaining
              │
              ▼
        Check if OTP was already used (used === true)
              │
        Used → 400 "OTP already used, request a new one"
              │
              ▼
        Check if OTP has expired (expiresAt < now)
              │
        Expired → delete record from DB → 400 "OTP expired"
              │
              ▼
        bcrypt.compare(submittedOTP, hashedOTP from DB)
              │
        ┌─────┴──────────┐
    OTP valid         OTP invalid
        │                 │
        ▼                 ▼
  Mark OTP as used   Increment consecutiveWrongAttempts
  Reset wrong count        │
  Save OTP record    ≥ 5 wrong attempts?
        │                  │
        ▼             Yes → set blockedUntil = now + 1 hour
  Set User.verified = true │
        │             Save record → 400 "Wrong OTP"
        ▼
  Look up User record
        │
  user null → 500 error
        │
        ▼
  Generate JWT
  (userId from User._id, email,
   signed with JWT_SECRET,
   expires in JWT_LIFETIME)
        │
        ▼
  Respond 200: { token }
```

---

## Database Models

### `User`
Stores the email address and verification status of every user who has requested an OTP.

| Field | Type | Description |
|-------|------|-------------|
| `email` | String | User's email address |
| `verified` | Boolean | `true` once the user has successfully completed OTP login (default: `false`) |

### `OtpVerification`
Stores the OTP state for each email address.

| Field | Type | Description |
|-------|------|-------------|
| `email` | String | User's email |
| `otp` | String | bcryptjs hash of the OTP (never stored in plain text) |
| `used` | Boolean | Whether the OTP has been consumed |
| `expiresAt` | Date | Timestamp when the OTP expires (5 minutes after generation) |
| `lastOTPGenerationTime` | Date | Timestamp of the last OTP request (used for per-email rate limiting) |
| `consecutiveWrongAttempts` | Number | Count of wrong OTP submissions — reset to 0 on new OTP request |
| `blockedUntil` | Date | Timestamp until which the account is locked out — reset to null on new OTP request |

---

## Email Sending via Resend

Resend is used because many hosting platforms (e.g. Render) block SMTP ports (465/587). Resend sends over HTTPS (port 443), which works everywhere.

**How it works:**
1. The `Resend` client is initialised with `RESEND_API_KEY` from the environment.
2. When an OTP is generated, `resend.emails.send()` is called with the plain-text OTP.
3. The `from` field uses your verified domain: `Company Name <you@yourdomain.com>`.
4. The plain OTP is only ever in memory during this step — it is never saved to the database.
5. If the email fails to send, an error is thrown and propagated back to the client — the OTP is not considered issued.

---

## JWT Token

After successful OTP verification, a JWT is signed inline using `jsonwebtoken`:

- **Payload:** `{ userId: User._id, email }`
- **Secret:** `JWT_SECRET` from environment
- **Expiry:** `JWT_LIFETIME` from environment (e.g. `30d`)

`userId` refers to the `User` model's `_id`, not the `OtpVerification` record. This means the token correctly identifies the user and can be used to look up the `User` collection in protected routes.

The client should store this token and send it in the `Authorization` header for subsequent authenticated requests.

---

## Rate Limiting

Two layers of rate limiting protect the endpoints:

### IP-level (express-rate-limit)
| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /getOTP` | 5 requests | 15 minutes |
| `POST /login` | 10 requests | 15 minutes |

`app.set('trust proxy', 1)` is set in `app.js` so the real client IP is correctly detected when deployed behind a reverse proxy (e.g. Render, Nginx).

### Email-level (custom logic)
| Rule | Detail |
|------|--------|
| OTP cooldown | New OTP can only be requested once every 60 seconds per email |
| Wrong attempt lockout | Account blocked for 1 hour after 5 consecutive wrong OTP attempts |
| Block reset | Both wrong attempt count and block are cleared when a new OTP is requested |

---

## Security Summary

| Mechanism | Detail |
|-----------|--------|
| OTP hashing | bcryptjs, 10 salt rounds — plain OTP never stored |
| OTP expiry | 5 minutes from generation |
| Per-email cooldown | 60 seconds between OTP requests |
| IP rate limit | 5 req/15min on getOTP, 10 req/15min on login |
| One-time use | OTP marked `used` immediately after successful login |
| Brute force protection | Account locked 1 hour after 5 wrong attempts |
| Mail failure handling | Error thrown if Resend fails — client receives 400, not a false 201 |
| JWT signing | HS256 with minimum 256-bit secret, signed against User._id |
| Duplicate user prevention | `findOneAndUpdate` with upsert — no duplicate User records |
| Proxy-aware rate limiting | `trust proxy` enabled for correct IP on hosted platforms |
