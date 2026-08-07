import { describe, expect, it } from "vitest";
import mergeMessageUpdate from "./merge-message-update";

describe("mergeMessageUpdate", () => {
  it("does not regress status or an edited body when an older HTTP echo arrives", () => {
    const current = {
      id: 1,
      body: "edited",
      status: "READ" as const,
      isEdited: true,
    };
    const staleEcho = {
      id: 1,
      body: "original",
      status: "PENDING" as const,
      isEdited: false,
    };

    expect(mergeMessageUpdate(current as any, staleEcho as any)).toMatchObject({
      body: "edited",
      status: "READ",
      isEdited: true,
    });
  });

  it("keeps a revoked message terminal when a stale sent echo arrives", () => {
    const revoked = {
      id: 2,
      body: "Mensagem apagada",
      status: "REVOKED" as const,
      isEdited: false,
      isForwarded: true,
      fileId: null,
    };
    const staleEcho = {
      ...revoked,
      body: "secret",
      status: "SENT" as const,
      isForwarded: false,
      fileId: 99,
    };

    expect(mergeMessageUpdate(revoked as any, staleEcho as any)).toEqual(revoked);
  });
});
