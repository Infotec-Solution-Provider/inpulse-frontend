Run from the frontend repository:

```sh
pnpm exec playwright test --config tests/auth-session.config.ts
```

These Chromium tests mount the real React `AuthProvider` and `authSession` coordinator. Navigation and API services are mocked; external HTTP requests are blocked. Vite is reused from the installed Vitest dependency, so no application server or backend is required. Playwright's Chromium browser must be installed.

Coverage includes initial loading, automatic renewal before token expiry, screen and draft preservation during renewal/retries, navigation during renewal, definitive 401 logout, and logout while renewal is pending. This validates browser behavior with controlled responses; it does not validate production cookies, CORS, deployment, or live authentication APIs.

The `.pw.ts` suffix keeps these isolated tests out of the repository's general Playwright configuration.
