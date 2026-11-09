import { describe, expect, it } from "vitest";
import {
  activateFrontendScope, clearFrontendChoices, frontendChoiceFromHash, frontendChoiceKey,
  frontendSwitchHref, parseFrontendChoice, resolveFrontendVersion,
} from "./frontend-selection";

function storageFixture() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("frontend session selection", () => {
  it.each([
    ["false", "false", "legacy", "legacy"],
    ["false", "true", "legacy", "new"],
    ["true", "false", "new", "new"],
    ["true", "true", "new", "legacy"],
  ] as const)("new=%s switch=%s chooses the configured default and accepts choices only when permitted", (next, switching, expectedDefault, expectedChoice) => {
    const parameters = { feature_new_frontend_enabled: next, feature_frontend_switch_enabled: switching };
    const requested = next === "true" ? "legacy" : "new";
    expect(resolveFrontendVersion(parameters)).toBe(expectedDefault);
    expect(resolveFrontendVersion(parameters, requested)).toBe(expectedChoice);
  });

  it("keeps current as the default when parameters are missing or malformed", () => {
    expect(resolveFrontendVersion({})).toBe("legacy");
    expect(resolveFrontendVersion({ feature_new_frontend_enabled: "TRUE", feature_frontend_switch_enabled: "1" }, "new")).toBe("legacy");
  });

  it("retains the choice during refresh and document navigation for the same identity", () => {
    const storage = storageFixture();
    const key = activateFrontendScope(storage, "odim", 23);
    storage.setItem(key, "new");
    expect(activateFrontendScope(storage, "odim", 23)).toBe(key);
    expect(storage.getItem(key)).toBe("new");
  });

  it.each([["odim", 24], ["other", 23]] as const)("clears a previous choice when changing identity to %s/%s", (instance, user) => {
    const storage = storageFixture();
    const key = activateFrontendScope(storage, "odim", 23);
    storage.setItem(key, "new");
    const otherKey = activateFrontendScope(storage, instance, user);
    expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem(otherKey)).toBeNull();
  });

  it("logout clears every frontend choice and retains unrelated session data", () => {
    const storage = storageFixture();
    storage.setItem("unrelated", "keep");
    storage.setItem(frontendChoiceKey("odim", 23), "new");
    storage.setItem(frontendChoiceKey("other", 24), "legacy");
    clearFrontendChoices(storage);
    expect(storage.length).toBe(1);
    expect(storage.getItem("unrelated")).toBe("keep");
  });

  it("uses a destination fragment without persisting any selection before navigation", () => {
    const storage = storageFixture();
    expect(frontendSwitchHref("odim filial", "new")).toBe("/nova/odim%20filial#frontend-choice=new");
    expect(frontendSwitchHref("odim", "legacy")).toBe("/odim#frontend-choice=legacy");
    expect(storage.length).toBe(0);
    expect(frontendChoiceFromHash("#frontend-choice=new")).toBe("new");
    expect(frontendChoiceFromHash("#frontend-choice=legacy")).toBe("legacy");
  });

  it("rejects foreign/malformed navigation markers and storage values", () => {
    for (const value of [null, "", "TRUE", "../new", "new&other=value"]) expect(parseFrontendChoice(value)).toBeNull();
    for (const hash of ["#new", "#frontend-choice=new&x=1", "#frontend-choice=NEW", "#other=legacy"]) expect(frontendChoiceFromHash(hash)).toBeNull();
  });
});
