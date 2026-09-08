import { describe, expect, it } from "vitest";
import compareMessageStatus from "./compare-message-status";

describe("uncertain delivery status", () => {
  it("does not let late uncertain acknowledgements regress confirmed delivery", () => {
    expect(compareMessageStatus("READ", "UNKNOWN")).toBe("READ");
    expect(compareMessageStatus("SENT", "UNKNOWN")).toBe("SENT");
    expect(compareMessageStatus("UNKNOWN", "PENDING")).toBe("UNKNOWN");
    expect(compareMessageStatus("UNKNOWN", "RECEIVED")).toBe("RECEIVED");
  });
});
