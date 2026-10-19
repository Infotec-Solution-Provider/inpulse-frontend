import { describe, it, expect } from "vitest";
import { createQueryStore } from "./query-state";
describe("transient CRM query state", () => {
  it("retains applied controls while keeping resources and actor scopes separate", () => {
    const actor = createQueryStore(),
      anotherActor = createQueryStore();
    actor.write("segments:filters", { name: "Consulta fictícia" });
    actor.write("segments:page", 3);
    expect(actor.read("segments:page", 0)).toBe(3);
    expect(actor.read("brands:page", 0)).toBe(0);
    expect(anotherActor.read("segments:filters", {})).toEqual({});
  });
  it("notifies mounted views and allows subscribers to leave without clearing the query", () => {
    const store = createQueryStore();
    let notifications = 0;
    const leave = store.subscribe(() => notifications++);
    store.write("list", { page: 2 });
    leave();
    store.write("list", { page: 4 });
    expect(notifications).toBe(1);
    expect(store.read("list", {})).toEqual({ page: 4 });
  });
});
