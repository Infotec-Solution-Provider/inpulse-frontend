Run `pnpm exec playwright test --config tests/reactions.config.ts`.

The Chromium fixture renders the production WhatsApp history, message and emoji selector. It uses the production confirmation hook, reaction snapshot application and SDK HTTP client. Contexts and unrelated media services are isolated; Playwright intercepts every reaction request. No real tenant, WhatsApp account or message is used.

Coverage includes WABA eligibility in an open individual chat, outbound availability, read-only/selection/finished/group/identity/status restrictions, unchanged REMOTE/WWEBJS availability, confirmed send/change/removal, provider error, timeout and mismatched-channel confirmation without automatic retries or optimistic reactions.
