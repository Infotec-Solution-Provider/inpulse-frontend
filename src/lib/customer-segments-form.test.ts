import { describe, expect, it } from "vitest";
import {
  createSegmentPayload,
  segmentDraftValidation,
  updateSegmentPayload,
} from "./customer-segments-form";

const legacy = { CODIGO: 0, NOME: null, ordem: null, COD_UNIDADE: 0 };

describe("segment form contracts", () => {
  it("sets a real unit or explicitly clears an existing unit without rewriting other fields", () => {
    expect(createSegmentPayload({ name: "Novo", order: "", unit: "12" })).toEqual({ NOME: "Novo", COD_UNIDADE: 12 });
    expect(updateSegmentPayload({ name: "", order: "", unit: "" }, legacy)).toEqual({ changes: { COD_UNIDADE: null }, expected: { NOME: null, ordem: null, COD_UNIDADE: 0 } });
    expect(segmentDraftValidation({ name: "Novo", order: "", unit: "0" }).unitError).toBeTruthy();
  });
  it("omits order on create so the database default is preserved", () => {
    expect(createSegmentPayload({ name: "  Indústria  ", order: "" })).toEqual({
      NOME: "Indústria",
    });
  });
  it("preserves legacy null name and unit when editing only the order", () => {
    const draft = { name: "", order: "-2" };
    expect(segmentDraftValidation(draft, legacy)).toMatchObject({
      nameError: "",
      hasChanges: true,
    });
    expect(updateSegmentPayload(draft, legacy)).toEqual({
      changes: { ordem: -2 },
      expected: { NOME: null, ordem: null, COD_UNIDADE: 0 },
    });
  });
  it("clears a nullable order explicitly and keeps unchanged fields out of changes", () => {
    expect(
      updateSegmentPayload(
        { name: "Atacado", order: "" },
        { ...legacy, NOME: "Atacado", ordem: 4 },
      ),
    ).toEqual({
      changes: { ordem: null },
      expected: { NOME: "Atacado", ordem: 4, COD_UNIDADE: 0 },
    });
  });
  it.each(["1.5", "1e3", "2147483648", "-2147483649", "abc"])(
    "rejects invalid integer %s",
    (order) => {
      expect(segmentDraftValidation({ name: "Nome", order }).orderError).not.toBe("");
    },
  );
  it("requires a name for new and renamed segments", () => {
    expect(segmentDraftValidation({ name: "  ", order: "" }).nameError).not.toBe("");
    expect(
      segmentDraftValidation({ name: "", order: "" }, { ...legacy, NOME: "Existente" }).nameError,
    ).not.toBe("");
    expect(segmentDraftValidation({ name: "a".repeat(51), order: "" }).nameError).not.toBe("");
  });
  it.each(["€", "Travessão –", "Emoji 😀", "Controle\u0080"])("rejects characters the current database transport cannot preserve: %s", name => {
    expect(segmentDraftValidation({ name, order: "" }).nameError).not.toBe("");
  });
  it("recognizes identical updates including a legacy null name", () => {
    expect(segmentDraftValidation({ name: "", order: "" }, legacy).hasChanges).toBe(false);
  });
  it("does not normalize a historic padded name while changing another field", () => {
    const original = { ...legacy, NOME: "  Legado  " };
    expect(updateSegmentPayload({ name: original.NOME, order: "9" }, original).changes).toEqual({
      ordem: 9,
    });
  });
});
