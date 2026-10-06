import { describe, expect, it, vi } from "vitest";
import type { InternalMessage } from "@/lib/sdk-local";
import {
  applyInternalMessageStatusEvent,
  canRetryInternalMessage,
  isOptimisticRetryPending,
  markInternalMessageRetryPending,
  readRetryError,
  retryErrorToastMessage,
  retryRequiresConfirmation,
  rollbackInternalMessageRetry,
  runInternalMessageRetry,
} from "./internal-message-retry";

function message(overrides: Partial<InternalMessage> = {}): InternalMessage {
  return {
    id: 10,
    instance: "nunes",
    from: "user:7",
    type: "chat",
    quotedId: null,
    internalChatId: 132,
    body: "texto",
    timestamp: "1759760000000",
    isForwarded: false,
    isEdited: false,
    status: "ERROR",
    fileId: null,
    fileName: null,
    fileType: null,
    fileSize: null,
    ...overrides,
  };
}

const linkedGroup = { chatType: "internal", wppGroupId: "1203630@g.us" };

function visible(overrides: Partial<Parameters<typeof canRetryInternalMessage>[0]> = {}) {
  return canRetryInternalMessage({
    message: message(),
    chat: linkedGroup,
    userId: 7,
    isAdmin: false,
    readOnly: false,
    selectionMode: false,
    ...overrides,
  });
}

describe("internal message retry visibility", () => {
  it("shows Reenviar to the author of a failed message in a WhatsApp-linked group", () => {
    expect(visible()).toBe(true);
  });

  it("shows Reenviar to an ADMIN even when the message belongs to someone else", () => {
    expect(visible({ userId: 99, isAdmin: true })).toBe(true);
    expect(visible({ userId: 99, isAdmin: false })).toBe(false);
    expect(visible({ userId: null, isAdmin: false })).toBe(false);
  });

  it("hides Reenviar for non-ERROR messages", () => {
    for (const status of ["PENDING", "UNKNOWN", "SENT", "RECEIVED", "READ"] as const) {
      expect(visible({ message: message({ status }) })).toBe(false);
    }
  });

  it("hides Reenviar outside WhatsApp-linked internal groups", () => {
    expect(visible({ chat: { chatType: "internal", wppGroupId: null } })).toBe(false);
    expect(visible({ chat: { chatType: "internal" } })).toBe(false);
    expect(visible({ chat: { chatType: "wpp", wppGroupId: "x@g.us" } })).toBe(false);
    expect(visible({ chat: null })).toBe(false);
  });

  it("hides Reenviar in read-only and selection modes", () => {
    expect(visible({ readOnly: true })).toBe(false);
    expect(visible({ selectionMode: true })).toBe(false);
  });

  it("respects an explicit backend refusal but tolerates a missing hint", () => {
    expect(
      visible({
        message: message({ whatsappRetry: { allowed: false, requiresConfirmation: false, reason: "RETRY_LIMIT" } }),
      }),
    ).toBe(false);
    expect(visible({ message: message({ whatsappRetry: undefined }) })).toBe(true);
    expect(visible({ message: message({ whatsappRetry: null }) })).toBe(true);
  });

  it("asks for confirmation unless the backend proved the message was not sent", () => {
    expect(retryRequiresConfirmation(message({ whatsappRetry: undefined }))).toBe(true);
    expect(retryRequiresConfirmation(message({ whatsappRetry: null }))).toBe(true);
    expect(
      retryRequiresConfirmation(
        message({ whatsappRetry: { allowed: true, requiresConfirmation: true } }),
      ),
    ).toBe(true);
    expect(
      retryRequiresConfirmation(
        message({ whatsappRetry: { allowed: true, requiresConfirmation: false } }),
      ),
    ).toBe(false);
  });
});

describe("internal message status merge", () => {
  const safe = { allowed: true, requiresConfirmation: false };

  it("stores the retry hint carried by an ERROR status event", () => {
    const next = applyInternalMessageStatusEvent(message({ status: "PENDING" }), {
      status: "ERROR",
      whatsappRetry: safe,
    });
    expect(next.status).toBe("ERROR");
    expect(next.whatsappRetry).toEqual(safe);
  });

  it("keeps the previous hint when an ERROR event comes without one", () => {
    const next = applyInternalMessageStatusEvent(message({ whatsappRetry: safe }), {
      status: "ERROR",
    });
    expect(next.whatsappRetry).toEqual(safe);
  });

  it("clears the hint once the status leaves ERROR", () => {
    const pending = applyInternalMessageStatusEvent(message({ whatsappRetry: safe }), {
      status: "PENDING",
      whatsappRetry: safe,
    });
    expect(pending.status).toBe("PENDING");
    expect(pending.whatsappRetry).toBeNull();

    const received = applyInternalMessageStatusEvent(pending, { status: "RECEIVED" });
    expect(received.status).toBe("RECEIVED");
    expect(received.whatsappRetry).toBeNull();
  });

  it("does not let a late status regress a confirmed delivery", () => {
    const next = applyInternalMessageStatusEvent(message({ status: "READ" }), {
      status: "UNKNOWN",
    });
    expect(next.status).toBe("READ");
    expect(next.whatsappRetry).toBeNull();
  });
});

describe("optimistic retry state", () => {
  it("marks PENDING and rolls back to ERROR with the original hint", () => {
    const original = message({ whatsappRetry: { allowed: true, requiresConfirmation: false } });
    const pending = markInternalMessageRetryPending(original);
    expect(pending.status).toBe("PENDING");
    expect(pending.whatsappRetry).toBeNull();

    const rolledBack = rollbackInternalMessageRetry(pending, original);
    expect(rolledBack.status).toBe("ERROR");
    expect(rolledBack.whatsappRetry).toEqual(original.whatsappRetry);
  });

  it("rolls back with an overriding hint when the backend requires confirmation", () => {
    const original = message({ whatsappRetry: { allowed: true, requiresConfirmation: false } });
    const rolledBack = rollbackInternalMessageRetry(
      markInternalMessageRetryPending(original),
      original,
      { allowed: true, requiresConfirmation: true },
    );
    expect(rolledBack.whatsappRetry).toEqual({ allowed: true, requiresConfirmation: true });
  });

  it("does not apply the optimistic PENDING to a message that left ERROR", () => {
    const received = message({ status: "RECEIVED" });
    expect(markInternalMessageRetryPending(received)).toBe(received);
  });

  it("does not roll back a PENDING that came from the server", () => {
    const original = message();
    const serverPending = applyInternalMessageStatusEvent(
      markInternalMessageRetryPending(original),
      { status: "PENDING" },
    );
    expect(serverPending.status).toBe("PENDING");
    expect(isOptimisticRetryPending(serverPending)).toBe(false);
    expect(rollbackInternalMessageRetry(serverPending, original)).toBe(serverPending);
  });

  it("keeps a newer socket status instead of rolling back", () => {
    const original = message();
    const received = { ...markInternalMessageRetryPending(original), status: "RECEIVED" as const };
    expect(rollbackInternalMessageRetry(received, original)).toBe(received);
  });
});

describe("retry error parsing", () => {
  function apiError(status: number, data: unknown) {
    const axiosLike = Object.assign(new Error(`Request failed with status code ${status}`), {
      response: { status, data },
    });
    const message =
      (data as { message?: string } | undefined)?.message || axiosLike.message;
    return new Error(message, { cause: axiosLike });
  }

  it("reads the code and message wrapped by ApiClient", () => {
    const parsed = readRetryError(
      apiError(409, { code: "CONFIRMATION_REQUIRED", message: "Confirme o reenvio" }),
    );
    expect(parsed).toEqual({
      status: 409,
      code: "CONFIRMATION_REQUIRED",
      message: "Confirme o reenvio",
    });
  });

  it("reads codes nested by other error envelopes", () => {
    expect(readRetryError(apiError(409, { message: "x", data: { code: "RETRY_LIMIT" } })).code).toBe(
      "RETRY_LIMIT",
    );
    expect(
      readRetryError(apiError(409, { message: "x", cause: { code: "NOT_RETRYABLE" } })).code,
    ).toBe("NOT_RETRYABLE");
  });

  it("falls back to friendly messages without a backend message", () => {
    expect(retryErrorToastMessage(readRetryError(apiError(409, { code: "RETRY_LIMIT" })))).toBe(
      "Limite de reenvios atingido para esta mensagem.",
    );
    expect(retryErrorToastMessage({ status: 403 })).toBe(
      "Apenas o autor ou um administrador pode reenviar esta mensagem.",
    );
    expect(retryErrorToastMessage(readRetryError(new Error("Network Error")))).toBe(
      "Não foi possível reenviar a mensagem.",
    );
  });
});

describe("runInternalMessageRetry", () => {
  function setup(request: () => Promise<unknown>) {
    let state = message({ whatsappRetry: { allowed: true, requiresConfirmation: false } });
    const original = state;
    const snapshots: InternalMessage[] = [];
    const errors: string[] = [];
    const successes: string[] = [];
    const deps = {
      request: vi.fn(request),
      update: (_m: InternalMessage, apply: (current: InternalMessage) => InternalMessage) => {
        state = apply(state);
        snapshots.push(state);
      },
      notifyError: (text: string) => errors.push(text),
      notifySuccess: (text: string) => successes.push(text),
    };
    return { deps, original, snapshots, errors, successes, get: () => state };
  }

  function conflict(code: string, message?: string) {
    const axiosLike = Object.assign(new Error("Request failed with status code 409"), {
      response: { status: 409, data: { code, message } },
    });
    return new Error(message || axiosLike.message, { cause: axiosLike });
  }

  it("shows PENDING optimistically and keeps it after the backend accepts", async () => {
    const t = setup(async () => ({ id: 10, status: "PENDING" }));
    expect(await runInternalMessageRetry(t.original, false, t.deps)).toBe("scheduled");
    expect(t.deps.request).toHaveBeenCalledWith(10, false);
    expect(t.snapshots[0].status).toBe("PENDING");
    expect(t.get().status).toBe("PENDING");
    expect(t.successes).toEqual(["Reenvio solicitado."]);
    expect(t.errors).toEqual([]);
  });

  it("returns a confirmation signal and rolls back without toasting on CONFIRMATION_REQUIRED", async () => {
    const t = setup(async () => {
      throw conflict("CONFIRMATION_REQUIRED", "Confirme o reenvio");
    });
    expect(await runInternalMessageRetry(t.original, false, t.deps)).toBe("confirmation-required");
    expect(t.get()).toMatchObject({
      status: "ERROR",
      whatsappRetry: { allowed: true, requiresConfirmation: true },
    });
    expect(t.errors).toEqual([]);
  });

  it("rolls back to ERROR and toasts the backend message on RETRY_LIMIT", async () => {
    const t = setup(async () => {
      throw conflict("RETRY_LIMIT", "Mensagem do backend RETRY_LIMIT");
    });
    expect(await runInternalMessageRetry(t.original, true, t.deps)).toBe("failed");
    expect(t.deps.request).toHaveBeenCalledWith(10, true);
    expect(t.get()).toMatchObject({ status: "ERROR", whatsappRetry: t.original.whatsappRetry });
    expect(isOptimisticRetryPending(t.get())).toBe(false);
    expect(t.errors).toEqual(["Mensagem do backend RETRY_LIMIT"]);
  });

  it("hides Reenviar after NOT_RETRYABLE instead of restoring the old allowed hint", async () => {
    const t = setup(async () => {
      throw conflict("NOT_RETRYABLE", "Mensagem do backend NOT_RETRYABLE");
    });
    expect(await runInternalMessageRetry(t.original, true, t.deps)).toBe("failed");
    expect(t.get()).toMatchObject({
      status: "ERROR",
      whatsappRetry: { allowed: false, reason: "NOT_RETRYABLE" },
    });
    expect(
      canRetryInternalMessage({
        message: t.get(),
        chat: linkedGroup,
        userId: 7,
        isAdmin: false,
        readOnly: false,
        selectionMode: false,
      }),
    ).toBe(false);
    expect(t.errors).toEqual(["Mensagem do backend NOT_RETRYABLE"]);

    // O proximo ERROR do socket traz a dica nova e reabre o reenvio.
    const next = applyInternalMessageStatusEvent(t.get(), {
      status: "ERROR",
      whatsappRetry: { allowed: true, requiresConfirmation: false },
    });
    expect(next.whatsappRetry).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it("does not touch a message that is no longer ERROR when retried from a stale snapshot", async () => {
    // Modal aberto com a mensagem em ERROR; outro usuario reenviou e chegou RECEIVED.
    const t = setup(async () => {
      throw conflict("NOT_RETRYABLE", "Mensagem nao esta mais com falha");
    });
    const snapshot = t.original;
    t.deps.update(snapshot, (current) =>
      applyInternalMessageStatusEvent(current, { status: "RECEIVED" }),
    );
    expect(await runInternalMessageRetry(snapshot, true, t.deps)).toBe("failed");
    expect(t.get().status).toBe("RECEIVED");
    expect(t.snapshots.every((s) => s.status === "RECEIVED")).toBe(true);
  });

  it("keeps a server-confirmed PENDING when the concurrent retry loses the claim", async () => {
    // eslint-disable-next-line prefer-const
    let t: ReturnType<typeof setup>;
    t = setup(async () => {
      // O reenvio do outro usuario venceu; o socket PENDING chega antes do 409.
      t.deps.update(t.original, (current) =>
        applyInternalMessageStatusEvent(current, { status: "PENDING" }),
      );
      throw conflict("NOT_RETRYABLE", "Reenvio ja em andamento");
    });
    expect(await runInternalMessageRetry(t.original, false, t.deps)).toBe("failed");
    expect(t.get().status).toBe("PENDING");
    expect(t.errors).toEqual(["Reenvio ja em andamento"]);
  });

  it("does not roll back after the backend accepted the retry", async () => {
    const t = setup(async () => ({ id: 10, status: "PENDING" }));
    await runInternalMessageRetry(t.original, false, t.deps);
    expect(isOptimisticRetryPending(t.get())).toBe(false);
    expect(rollbackInternalMessageRetry(t.get(), t.original)).toBe(t.get());
  });

  it("rolls back on network failures with a generic message", async () => {
    const t = setup(async () => {
      throw new Error("Network Error");
    });
    expect(await runInternalMessageRetry(t.original, false, t.deps)).toBe("failed");
    expect(t.get().status).toBe("ERROR");
    expect(t.errors).toEqual(["Não foi possível reenviar a mensagem."]);
  });
});
