# shared/

- **crypto.ts** — `hashSha256()` — SHA256 hash of a string using Node crypto
- **types.ts** — `User` interface (id, username, email, email_verified, display_name, pronouns, avatar_url, status, bio, timestamps), `RefreshToken` interface
- **middleware/** — `verifyUserToken`, `internalAuth`, `errorHandler` (see middleware/index.md)
