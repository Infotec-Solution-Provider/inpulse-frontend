import { afterEach, expect, it, vi } from "vitest";
import { AdminClient } from "./client";
afterEach(() => vi.unstubAllGlobals());

it("binds the admin cookie/CSRF and explicit target without CRM auth interception", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ csrfToken: "csrf-test" }), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ operationId: "op", state: "ACCEPTED" }), { status: 202 }),
    );
  vi.stubGlobal("fetch", fetch);
  const client = new AdminClient();
  await client.session();
  await client.save("homolog", "tenant/path", "whatsapp", {
    operationId: "op",
    revision: "r1",
    target: { scope: "USER", userId: 7 },
    changes: [{ key: "flag", action: "set", value: true }],
  });
  const [url, options] = fetch.mock.calls[1];
  expect(url).toBe(
    "/infotec/admin/api/environments/homolog/tenants/tenant%2Fpath/settings/whatsapp",
  );
  expect(options.headers["X-CSRF-Token"]).toBe("csrf-test");
  expect(options.headers.Authorization).toBeUndefined();
  expect(options.credentials).toBe("same-origin");
  expect(JSON.parse(options.body).target).toEqual({ scope: "USER", userId: 7 });
});

it("does not retry an uncertain write and signals expiration", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response('{"message":"Sessão expirada"}', { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  const client = new AdminClient();
  client.onUnauthorized = vi.fn();
  await expect(
    client.serviceAction("production", "users", { operationId: "op", action: "stop" }),
  ).rejects.toThrow("Sessão expirada");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(client.onUnauthorized).toHaveBeenCalledOnce();
});
