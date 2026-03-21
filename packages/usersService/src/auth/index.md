# auth/

- **auth.service.ts** — `registerUser()` (creates user + credentials in transaction, sends OTP), `loginUser()` (bcrypt validation), `refreshAccessToken()` (atomic delete-and-insert prevents race conditions), JWT generation helpers
- **auth.controller.ts** — `register()`, `login()`, `refresh()`, `verifyEmail()`, `resendVerification()` — request validation + error responses
- **auth.routes.ts** — `authRouter` — POST: `/register`, `/login`, `/refresh`, `/verify-email`, `/resend-verification`
- **verification.service.ts** — `sendVerificationOtp()` (6-digit code, hashed, 15-min expiry), `verifyOtp()` (validates + sets email_verified)
- **auth.controller.test.ts** / **auth.service.test.ts** / **verification.service.test.ts** — unit tests
- **auth.integration.test.ts** — integration tests for auth flow
