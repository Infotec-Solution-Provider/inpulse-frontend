import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSession } from "../auth-session";
import { formatSendDiagnostic, MessageSendStageError, messageSendDiagnostic } from "./message-send-diagnostics";
import { isDefinitiveSendFailure, sendIdentifiedMessage, UnconfirmedMessageSendError } from "./reliable-message-send";

afterEach(() => { authSession.clearConfiguration(); vi.unstubAllGlobals(); });

describe("send diagnostics", () => {
  it("records an auth failure before HTTP dispatch without leaking tokens or request content", async () => {
    const failure = Object.assign(new Error("secret response"), {
      response: { status: 401, data: { secret: "secret body" } },
      config: { headers: { Authorization: "secret token" } }, code: "ERR_BAD_REQUEST",
    });
    authSession.configure({ instance: "tenant", refresh: async () => { throw failure; }, onInvalid: vi.fn() });
    const adapter = vi.fn();
    const client = axios.create({ adapter });
    authSession.install(client);
    const error = await client.post("/api/whatsapp/3/messages", "secret message").catch((error: unknown) => error);
    expect(adapter).not.toHaveBeenCalled();
    expect(messageSendDiagnostic(error)).toMatchObject({ stage: "authentication", httpStatus: 401, code: "ERR_BAD_REQUEST" });
    expect(isDefinitiveSendFailure(error)).toBe(true);
    const copied = formatSendDiagnostic({ id: "attempt-1", status: "failed", diagnostic: messageSendDiagnostic(error) });
    expect(copied).not.toContain("secret");
    expect(copied).toContain("attempt-1");
  });

  it("retains the POST error after an inconclusive lookup without resending", async () => {
    const failure = new MessageSendStageError("request", Object.assign(new Error("timeout"), { code: "ECONNABORTED" }));
    const send = vi.fn(async () => { throw failure; });
    const error = await sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, async () => null)
      .catch((error: unknown) => error);
    expect(error).toBeInstanceOf(UnconfirmedMessageSendError);
    expect(isDefinitiveSendFailure(error)).toBe(false);
    expect(messageSendDiagnostic(error)).toMatchObject({ stage: "request", code: "ECONNABORTED" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps the innermost known stage and tolerates circular causes", () => {
    const cause = { cause: null as unknown, response: { status: 503 } };
    cause.cause = cause;
    const error = new MessageSendStageError("request", new MessageSendStageError("authentication", cause));
    expect(messageSendDiagnostic(error)).toMatchObject({ stage: "authentication", httpStatus: 503 });
  });

  it("retains diagnostics after a reload without persisting file bytes", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const store = await import("./pending-chat-sends");
    const diagnostic = messageSendDiagnostic(new MessageSendStageError("upload", new Error("failed")));
    store.updatePendingChatSends("diagnostic-session", () => [{
      id: "attempt-2", scope: "chat", status: "failed", diagnostic,
      snapshot: { text: "hello", sendAsAudio: false, sendAsDocument: false, isEmojiMenuOpen: false },
    }]);
    await Promise.resolve();
    vi.resetModules();
    const restored = await import("./pending-chat-sends");
    expect(restored.getPendingChatSends("diagnostic-session")[0]).toMatchObject({ id: "attempt-2", diagnostic });
  });
});
