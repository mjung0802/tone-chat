# auth/

- **auth.client.ts** — `registerUser()`, `loginUser()`, `refreshToken()`, `verifyEmail()`, `resendVerification()` — delegates all auth operations to usersService
- **auth.rateLimit.ts** — `authRateLimiters` — register (3/hr), login (5/15min), refresh (10/15min), verify/resend (10/hr, 5/hr)
- **auth.routes.ts** — `authRouter` — public: POST `/register`, `/login`, `/refresh`; protected: POST `/verify-email`, `/resend-verification`; sets/rotates/clears httpOnly `refreshToken` cookie on login, register, refresh, and logout; strips `refreshToken` from JSON response body on web
- **auth.routes.test.ts** — unit tests for cookie set/rotate/clear behaviour
