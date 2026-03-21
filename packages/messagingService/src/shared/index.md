# shared/

- **roles.ts** — `Role` type, `getRoleLevel()`, `isAbove()` — hierarchy: member(0) → mod(1) → admin(2) → owner(3); `isAbove()` uses strict greater-than
- **roles.test.ts** — unit tests for role utilities
- **middleware/** — `requireMember`, `internalAuth`, `errorHandler` (see middleware/index.md)
- **types/express.d.ts** — Express `Request` augmentation adding `member` and `server` properties
