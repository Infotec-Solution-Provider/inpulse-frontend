import { afterEach, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { authSession } from "../auth-session";
import WalletsClient from "./wallets.client";

afterEach(() => { authSession.clearConfiguration(); vi.restoreAllMocks(); });
it("paginates management reads with a pinned session and preserves self-query contract", async () => {
  authSession.setAccessToken("fixture-a");
  const client = new WalletsClient("http://fixture.invalid");
  const calls: unknown[] = [];
  client.ax.defaults.adapter = async config => {
    calls.push([config.url, config.params, config.headers.get("Authorization")]);
    authSession.setAccessToken("fixture-b");
    return { config, status: 200, statusText: "OK", headers: {}, data: { data: [{ id: calls.length }], nextCursor: calls.length === 1 ? 7 : null } };
  };
  expect(await client.getWallets()).toHaveLength(2);
  expect(calls).toEqual([["/api/wallets/manage", {}, "Bearer fixture-a"], ["/api/wallets/manage", { after: 7 }, "Bearer fixture-a"]]);
  await client.getUserWallets("fixture-b", 8);
  expect(calls[2]).toEqual(["/api/wallets", { instance: "fixture-b", userId: 8 }, "Bearer fixture-b"]);
});
it("sends persisted rename/delete versions and number-array member reads", async () => {
  authSession.setAccessToken("fixture-a");
  const client = new WalletsClient("http://fixture.invalid");
  const calls: unknown[] = [];
  client.ax.defaults.adapter = async config => {
    calls.push([config.method, config.url, config.data ? JSON.parse(config.data) : null]);
    return { config, status: 200, statusText: "OK", headers: {}, data: { data: config.method === "get" ? [7] : { id: 3 } } };
  };
  await client.updateWalletName(3, "Changed", "v1");
  await client.deleteWallet(3, "v2");
  expect(await client.getUserInWallet(3, 7)).toBe(true);
  expect(calls).toEqual([["put", "/api/wallets/3/name", { newName: "Changed", version: "v1" }], ["delete", "/api/wallets/3", { version: "v2" }], ["get", "/api/wallets/3/users", null]]);
});
it("does not repeat uncertain wallet writes and retains the API error message", async () => {
  authSession.setAccessToken("fixture-a");
  const client = new WalletsClient("http://fixture.invalid");
  let calls = 0;
  client.ax.defaults.adapter = async config => { calls++; throw new AxiosError("timeout", AxiosError.ECONNABORTED, config); };
  await expect(client.createWallet("Fixture")).rejects.toThrow("timeout");
  expect(calls).toBe(1);
});
