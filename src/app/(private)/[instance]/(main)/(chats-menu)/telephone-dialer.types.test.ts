import { describe, expect, it } from "vitest";
import type { CustomerTelephonySchedule } from "@/lib/sdk-local";
import { mapTelephonyScheduleToQueueItem } from "./telephone-dialer.types";
const schedule = (fields: Partial<CustomerTelephonySchedule>) =>
  ({
    CODIGO: 1,
    CLIENTE: 7,
    CLIENTE_RAZAO: "Cliente",
    DT_AGENDAMENTO: "2026-11-03 10:00:00",
    ...fields,
  }) as CustomerTelephonySchedule;
describe("campaign queue phone projection", () => {
  it("offers the customer's fourth phone even when the schedule has no phone4 column", () => {
    const item = mapTelephonyScheduleToQueueItem(
      schedule({ FONE1: "1133334444", FONE4: "11999998888", DESC_FONE4: "Contato alternativo" }),
    );
    expect(item.phoneOptions).toEqual([
      { key: "FONE1", phone: "1133334444", description: undefined },
      { key: "FONE4", phone: "11999998888", description: "Contato alternativo" },
    ]);
  });
  it("does not repeat the fourth phone when generation compacted it into the primary slot", () => {
    const item = mapTelephonyScheduleToQueueItem(
      schedule({ FONE1: "11999998888", FONE4: "11999998888" }),
    );
    expect(item.phone).toBe("11999998888");
    expect(item.phoneOptions).toHaveLength(1);
  });
  it("uses a valid fourth phone when an old primary snapshot is not dialable", () => {
    const item = mapTelephonyScheduleToQueueItem(schedule({ FONE1: "101", FONE4: "11999998888" }));
    expect(item.phone).toBe("11999998888");
    expect(item.phoneOptions.map((option) => option.key)).toEqual(["FONE4"]);
  });
});
