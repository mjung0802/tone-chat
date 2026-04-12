# shared/

- **roles.ts** — `Role` type, `getRoleLevel()`, `isAbove()` — hierarchy: member(0) → mod(1) → admin(2) → owner(3); `isAbove()` uses strict greater-than
- **roles.test.ts** — unit tests for role utilities
- **parseQueryLimit.ts** — `parseQueryLimit(raw, max?, fallback?)` — safely parses a query-string limit value; handles NaN/Infinity/negative inputs by falling back to default (50); caps at max (100)
- **middleware/** — `verifyUserToken`, `requireMember`, `internalAuth`, `errorHandler` (see middleware/index.md)
- **types/express.d.ts** — Express `Request` augmentation adding `userId`, `member`, and `server` properties
