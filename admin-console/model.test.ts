import { describe, expect, it } from "vitest";
import { compileChanges, searchableField } from "./model";
import type { Snapshot } from "./types";

const snapshot: Snapshot = {
  tenant: "demo",
  source: "whatsapp",
  revision: "r1",
  values: { timeout: 120000, flag: false, mode: "safe", json: { a: 1 } },
  secrets: { api_key: { configured: true } },
  catalog: [
    {
      key: "timeout",
      label: "Tempo",
      description: "Em minutos",
      category: "Atendimento",
      type: "number",
      multiplier: 60000,
      min: 1,
      max: 5,
    },
    { key: "flag", label: "Recursos", description: "Flag", category: "Recursos", type: "boolean" },
    {
      key: "api_key",
      label: "Credencial",
      description: "Chave protegida",
      category: "Integração",
      type: "secret",
    },
    {
      key: "mode",
      label: "Modo",
      description: "Modo",
      category: "Recursos",
      type: "enum",
      options: [
        { label: "Seguro", value: "safe" },
        { label: "Novo", value: "new" },
      ],
    },
    { key: "json", label: "JSON", description: "Objeto", category: "Integração", type: "json" },
  ],
};
describe("administrative typed changes", () => {
  it("omits untouched/empty credentials and sends explicit removals only", () => {
    expect(compileChanges(snapshot, { api_key: { action: "set", input: "" } }).changes).toEqual([]);
    expect(compileChanges(snapshot, { api_key: { action: "remove", input: "" } }).changes).toEqual([
      { key: "api_key", action: "remove" },
    ]);
    expect(
      compileChanges(snapshot, { api_key: { action: "set", input: "new-key" } }).changes,
    ).toEqual([{ key: "api_key", action: "set", value: "new-key" }]);
  });
  it("validates numeric units, enum and JSON while keeping valid typed values", () => {
    expect(
      compileChanges(snapshot, {
        timeout: { action: "set", input: "3" },
        flag: { action: "set", input: "true" },
        mode: { action: "set", input: '"new"' },
      }).changes,
    ).toEqual([
      { key: "timeout", action: "set", value: 180000 },
      { key: "flag", action: "set", value: true },
      { key: "mode", action: "set", value: "new" },
    ]);
    const invalid = compileChanges(snapshot, {
      timeout: { action: "set", input: "0" },
      mode: { action: "set", input: '"invalid"' },
      json: { action: "set", input: "{oops}" },
    });
    expect(Object.keys(invalid.errors)).toEqual(["timeout", "mode", "json"]);
    expect(invalid.changes).toEqual([]);
  });
  it("ignores reverted values, read-only fields and includes explicit resets", () => {
    expect(
      compileChanges(snapshot, {
        timeout: { action: "set", input: "2" },
        flag: { action: "reset", input: "" },
      }).changes,
    ).toEqual([{ key: "flag", action: "reset" }]);
    expect(
      compileChanges(
        { ...snapshot, catalog: snapshot.catalog.map((field) => ({ ...field, readOnly: true })) },
        { api_key: { action: "set", input: "new" } },
      ).changes,
    ).toEqual([]);
  });
  it("searches technical keys and accent-independent descriptions", () => {
    expect(searchableField(snapshot.catalog[2], "api_key")).toBe(true);
    expect(searchableField(snapshot.catalog[2], "integracao")).toBe(true);
  });
});
