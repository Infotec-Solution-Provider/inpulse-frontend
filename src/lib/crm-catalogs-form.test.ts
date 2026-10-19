import { describe, expect, it } from "vitest";
import { catalogDraft, catalogExpected, validateCatalogDraft } from "./crm-catalogs-form";

describe("CRM catalog drafts", () => {
  it("preserves untouched historical labels, zero, null and unsupported bytes", () => {
    const original = { CODIGO: -1, NOME: "Nome\u0080 ", PRIORIDADE: null, COD_UNIDADE: 0 };
    const draft = { ...catalogDraft("medias", original), PRIORIDADE: "3" };
    expect(validateCatalogDraft("medias", draft, original)).toMatchObject({
      valid: true,
      changes: { PRIORIDADE: 3 },
    });
    expect(catalogExpected("medias", original)).toEqual({
      NOME: "Nome\u0080 ",
      PRIORIDADE: null,
      COD_UNIDADE: 0,
    });
  });
  it("distinguishes defaults at creation from explicit null when clearing", () => {
    const draft = { CODIGO: "7", NOME: "Origem digital", PRIORIDADE: "", COD_UNIDADE: "" };
    expect(validateCatalogDraft("medias", draft).changes).toEqual({
      CODIGO: 7,
      NOME: "Origem digital",
    });
    expect(
      validateCatalogDraft("medias", draft, {
        CODIGO: 7,
        NOME: "Origem digital",
        PRIORIDADE: 0,
        COD_UNIDADE: 1,
      }).changes,
    ).toEqual({ PRIORIDADE: null, COD_UNIDADE: null });
  });
  it.each(["0", "-1", "1.1", "2147483648", "foo"])(
    "rejects invalid new manual identity %s",
    (code) => {
      expect(
        validateCatalogDraft("customer-groups", { CODIGO: code, DESCRICAO: "Grupo" }).errors.CODIGO,
      ).toBeTruthy();
    },
  );
  it("requires brand unit and omits an auto-generated code", () => {
    expect(
      validateCatalogDraft("brands", {
        CODIGO: "",
        DESCRICAO: "Marca",
        COD_ERPMARCA: "",
        UNIDADE: "",
      }).valid,
    ).toBe(false);
    expect(
      validateCatalogDraft("brands", {
        CODIGO: "",
        DESCRICAO: "Marca",
        COD_ERPMARCA: "",
        UNIDADE: "2",
      }).changes,
    ).toEqual({ DESCRICAO: "Marca", COD_ERPMARCA: null, UNIDADE: 2 });
  });
  it("requires uppercase state identities and preserves historical city state text", () => {
    expect(
      validateCatalogDraft("states", { UF: "sp", NOME: "São Paulo", ORDEM: "", FUSOHORARIO: "" })
        .valid,
    ).toBe(false);
    const original = {
      CODIGO: 2,
      NOME: "Cidade",
      UF: "Histórico",
      ORDEM: null,
      ORDEMESTADO: null,
      ORDEMCIDADE: null,
    };
    expect(
      validateCatalogDraft("cities", { ...catalogDraft("cities", original), ORDEM: "0" }, original),
    ).toMatchObject({ valid: true, changes: { ORDEM: 0 } });
    expect(
      validateCatalogDraft(
        "cities",
        { ...catalogDraft("cities", original), UF: "inválido" },
        original,
      ).errors.UF,
    ).toBeTruthy();
  });
  it.each(["Emojis 😀", "Euro €", "Controle\u0080"])(
    "blocks incompatible new labels %s",
    (DESCRICAO) => {
      expect(validateCatalogDraft("origins", { CODIGO: "1", DESCRICAO }).valid).toBe(false);
    },
  );
});
