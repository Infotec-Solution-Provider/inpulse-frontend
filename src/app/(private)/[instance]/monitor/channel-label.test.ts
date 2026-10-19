import { describe, expect, it } from "vitest";
import { lastMessageChannelLabel } from "./channel-label";
import { appliedFilterLabels } from "./applied-filter-labels";
import { createInitialFilters } from "./filters-state";
import type { MonitorOperational } from "./types";

describe("specific last-message channel", () => {
  it("uses name and number, never infers a specific channel from provider type", () => {
    expect(lastMessageChannelLabel({ channel: "WABA" } as MonitorOperational)).toBeNull();
    expect(
      lastMessageChannelLabel({
        lastMessageChannel: { id: 21, name: "Comercial", phone: "+55 11" },
      } as MonitorOperational),
    ).toBe("Comercial · +55 11");
    expect(
      lastMessageChannelLabel({
        lastMessageChannel: { id: 21, name: "Histórico", phone: null },
      } as MonitorOperational),
    ).toBe("Histórico");
  });
  it("has an independently removable applied chip and a neutral default", () => {
    expect(appliedFilterLabels(createInitialFilters(), String)).toEqual([]);
    expect(
      appliedFilterLabels(
        { ...createInitialFilters(), lastMessageChannelId: 21 },
        String,
        () => "Comercial",
      ),
    ).toEqual([{ key: "lastMessageChannelId", label: "Canal: Comercial" }]);
  });
});
