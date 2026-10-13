import { afterEach, describe, expect, it, vi } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";
import { formatUrl } from "next/dist/shared/lib/router/utils/format-url";
import * as blockedHandler from "../app/api/service-proxy-blocked/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function rewritesFor(targets: string) {
  vi.stubEnv("API_PROXY_TARGETS", targets);
  vi.resetModules();
  const { default: config } = await import("../../next.config");
  const rewrites = await config.rewrites?.();
  if (!rewrites || Array.isArray(rewrites)) return [];
  return rewrites.beforeFiles ?? [];
}

async function destinationFor(
  pathname: string,
  targets = "whatsapp=http://127.0.0.1:7105,users=http://127.0.0.1:7101,instances=http://127.0.0.1:7100",
) {
  for (const rewrite of await rewritesFor(targets)) {
    const params = getPathMatch(rewrite.source)(pathname);
    if (params)
      return formatUrl(
        prepareDestination({
          destination: rewrite.destination,
          params,
          query: {},
          appendParamsToQuery: false,
        }).parsedDestination,
      );
  }
  return null;
}

describe("public service proxy", () => {
  it.each([
    "session/chats",
    "chats",
    "chats/17",
    "chats/17/messages",
    "chats/17/finish",
    "groups",
    "groups/17",
    "groups/17/image",
    "messages/17",
    "messages/17/reaction",
    "messages/17/whatsapp-retry",
    "chat/17/mark-as-read",
    "monitor/chats",
    "whatsapp-senders",
    "whatsapp-senders/names",
    "whatsapp-senders/messages",
    "whatsapp-senders/name",
  ])("preserves the authenticated internal conversation route %s", async (route) => {
    expect(await destinationFor(`/_svc/whatsapp/api/internal/${route}`)).toBe(
      `http://127.0.0.1:7105/api/internal/${route}`,
    );
  });

  it.each([
    "/_svc/whatsapp/api/internal/whatsapp/chats/17",
    "/_svc/whatsapp/api/internal/whatsapp/chats/17/agent-send-message",
    "/_svc/whatsapp/api/internal/whatsapp/contacts/customer",
    "/_svc/whatsapp/api/internal/whatsapp/customers/profile-tags/customer-ids",
    "/_svc/whatsapp/api/internal/unknown-maintenance",
    "/_svc/whatsapp/api/internal/chats/17/maintenance",
    "/_svc/whatsapp/api/internal/messages/17/maintenance",
    "/_svc/whatsapp/api/internal/chats/maintenance",
    "/_svc/whatsapp/api/_internal/tenant-sql",
    "/_svc/users/api/_internal/push-notifications",
    "/_svc/users/api/internal/session/chats",
    "/_svc/instances/api/internal/query",
  ])("blocks maintenance and non-allowlisted internal routes: %s", async (pathname) => {
    expect(await destinationFor(pathname)).toBe("/api/service-proxy-blocked");
  });

  it.each(["states", "states/RS/cities"])(
    "publishes the instances geography route %s",
    async (route) => {
      expect(await destinationFor(`/_svc/instances/api/instances/geo/${route}`)).toBe(
        `http://127.0.0.1:7100/api/instances/geo/${route}`,
      );
    },
  );

  it.each(["", "/homolog", "/homolog/query", "/root/auth", "/homolog/parameters"])(
    "does not publish instances SQL, catalog or root auth: %s",
    async (suffix) => {
      expect(await destinationFor(`/_svc/instances/api/instances${suffix}`)).toBeNull();
    },
  );

  it("keeps other configured authenticated APIs and respects absent proxy configuration", async () => {
    expect(await destinationFor("/_svc/users/api/auth/session")).toBe(
      "http://127.0.0.1:7101/api/auth/session",
    );
    expect(await destinationFor("/_svc/whatsapp/api/internal/groups", "")).toBeNull();
    expect(
      await destinationFor("/_svc/whatsapp/api/internal/groups", "users=http://127.0.0.1:7101"),
    ).toBe("/api/service-proxy-blocked");
  });

  it.each(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const)(
    "responds 404 without data or dynamic tenant rendering for blocked %s requests",
    async (method) => {
      const response = blockedHandler[method]();
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("");
    },
  );
});
