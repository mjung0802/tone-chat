# config/

- **index.ts** — `config` object (port, JWT secret, service URLs, internal API key, CORS origins) + `validateConfig()` that blocks production startup if dev defaults are used
