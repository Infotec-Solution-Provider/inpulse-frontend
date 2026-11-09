# Chat start feedback regression

Run `npm run test:chat-start:e2e` and
`npx vitest run src/lib/utils/start-user-chat.test.ts`.

Chromium renders the real start-contact item and official template modal. The
fixture replaces service contexts, uses the real `ApiClient` response interceptor
and sends requests intercepted by Playwright with HTTP 200/403 responses. Tests
assert one visible server denial, no unhandled rejection, and dialog completion
only after success for common and official channels.

Unit tests exercise the helper used by the context: successful responses remain
unchanged, rejection clears the pending selection and retains the original error,
and late failures cannot erase a newer request even for the same contact.

The fixture does not exercise the full authenticated provider, backend ownership
rules, production sockets, or backend persistence. No real contact is accessed.
