# config/

- **index.ts** — `config` object (port, DATABASE_URL, JWT secrets, SMTP settings) + `validateConfig()` for production. SMTP is not a hard production requirement — if unconfigured, logs a warning and OTPs print to console instead of being emailed.
- **database.ts** — `sql` postgres.js instance using config DATABASE_URL
