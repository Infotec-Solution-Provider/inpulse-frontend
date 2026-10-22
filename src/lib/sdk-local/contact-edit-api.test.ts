import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authSession } from "../auth-session";
import WhatsappClient from "./whatsapp.client";

afterEach(() => { authSession.clearConfiguration(); vi.restoreAllMocks(); });
describe("contact edit uses the protected customer link command", () => {
  it("links first through the specific command and keeps customerId only as edit precondition", async () => {
    const client = new WhatsappClient("http://fixture.invalid");
    authSession.setAccessToken("fixture-a");
    const calls: Array<{ url: string; data: unknown }> = [];
    client.ax.defaults.adapter = async config => {
      calls.push({ url: config.url!, data: JSON.parse(config.data) });
      return { config, status: 200, statusText: "OK", headers: {}, data: { data: { id: 1, name: "After", customerId: 8 } } };
    };
    await client.updateContact(1, "After", 8, [3]);
    expect(calls).toEqual([
      { url: "/api/whatsapp/contacts/1/customer", data: { customerId: 8 } },
      { url: "/api/whatsapp/contacts/1", data: { name: "After", customerId: 8, sectorIds: [3] } },
    ]);
  });
  it("does not edit the contact when the link is rejected", async () => {
    const client = new WhatsappClient("http://fixture.invalid");
    const post = vi.spyOn(client.ax, "post").mockRejectedValue(new Error("Already linked"));
    const put = vi.spyOn(client.ax, "put");
    await expect(client.updateContact(1, "After", 99)).rejects.toThrow("Already linked");
    expect(post).toHaveBeenCalledTimes(1); expect(put).not.toHaveBeenCalled();
  });
  it("pins the same token even if the global tenant session changes between commands", async () => {
    const client = new WhatsappClient("http://fixture.invalid");
    authSession.setAccessToken("fixture-a");
    const authorizations: unknown[] = [];
    client.ax.defaults.adapter = async config => {
      authorizations.push(config.headers.get("Authorization"));
      expect(config).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
      authSession.setAccessToken("fixture-b");
      return { config, status: 200, statusText: "OK", headers: {}, data: { data: { id: 1 } } };
    };
    await client.updateContact(1, "After", 8);
    expect(authorizations).toEqual(["Bearer fixture-a", "Bearer fixture-a"]);
  });
  it.each([undefined, null])("does not request linkage for %s", async customerId => {
    const client = new WhatsappClient("http://fixture.invalid");
    const post = vi.spyOn(client.ax, "post");
    const put = vi.spyOn(client.ax, "put").mockResolvedValue({ data: { data: { id: 1 } } });
    await client.updateContact(1, "After", customerId);
    expect(post).not.toHaveBeenCalled(); expect(put).toHaveBeenCalledTimes(1);
  });
  it("never replays an uncertain link write", async () => {
    const client = new WhatsappClient("http://fixture.invalid");
    let count = 0;
    client.ax.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      count++; throw new AxiosError("timeout", AxiosError.ECONNABORTED, config);
    };
    await expect(client.updateContact(1, "After", 8)).rejects.toThrow("timeout"); expect(count).toBe(1);
  });
  it("reports partial confirmation and never repeats commands when edit fails after linkage", async () => {
    const client = new WhatsappClient("http://fixture.invalid");
    const post = vi.spyOn(client.ax, "post").mockResolvedValue({ data: { data: { contact: { id: 1 } } } });
    const put = vi.spyOn(client.ax, "put").mockRejectedValue(new Error("Lost edit response"));
    await expect(client.updateContact(1, "After", 8)).rejects.toThrow("O vínculo foi confirmado");
    expect(post).toHaveBeenCalledTimes(1); expect(put).toHaveBeenCalledTimes(1);
  });
});
