# config/

- **index.ts** — `config` object (port, DATABASE_URL, JWT secrets, SMTP settings) + `validateConfig()` for production
- **database.ts** — `sql` postgres.js instance using config DATABASE_URL
