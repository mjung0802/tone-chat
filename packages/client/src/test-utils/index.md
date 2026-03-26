# test-utils/

- **fixtures.ts** — JWT helpers (VALID_JWT, EXPIRED_JWT, MALFORMED_JWT), factory functions: `makeMessage()`, `makeReaction()`, `makeAttachment()`, `makeMember()`, `makeUser()`
- **renderWithProviders.tsx** — `createTestQueryClient()`, `createHookWrapper()`, `renderWithProviders()` — wraps components in QueryClientProvider + PaperProvider for tests
- **queryMocks.ts** — `mockQuerySuccess<T>(data)`, `mockMutationResult(overrides?)` — factory helpers for fully-typed TanStack Query result mocks in Jest tests
