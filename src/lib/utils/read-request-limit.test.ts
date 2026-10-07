import { expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { readRequestLimitMessage } from "./read-request-limit";
import ApiClient from "../sdk-local/api-client";

vi.mock("react-toastify", () => ({ toast: { warning: vi.fn() } }));
vi.mock("@/lib/auth-session", () => ({ authSession: { install: vi.fn() } }));

function limited() {
  return new AxiosError("limited", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 429, statusText: "Too Many Requests", headers: { "retry-after": "7" },
    data: { code: "READ_REQUEST_LIMIT" }, config: {} as never,
  });
}
it("presents the server wait both for Axios and SDK-wrapped errors", () => {
  expect(readRequestLimitMessage(limited())).toContain("7 segundos");
  expect(readRequestLimitMessage(new Error("wrapped", { cause: limited() }))).toContain("7 segundos");
  expect(readRequestLimitMessage(new Error("other"))).toBeNull();
});
it("does not turn provider throttling into a read-limit notification", () => {
  const error = limited(); error.response!.data = { code: "PROVIDER_LIMIT" };
  expect(readRequestLimitMessage(error)).toBeNull();
});
it("does not automatically retry a limited request", async () => {
  const client = new ApiClient("http://example.invalid");
  const adapter = vi.fn(async () => { throw limited(); });
  client.ax.defaults.adapter = adapter;
  await expect(client.ax.get("/api/whatsapp/session/chats")).rejects.toThrow("7 segundos");
  expect(adapter).toHaveBeenCalledTimes(1);
});
