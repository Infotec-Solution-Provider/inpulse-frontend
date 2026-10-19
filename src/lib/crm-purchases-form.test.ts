import { describe, expect, it } from "vitest";
import {
  displayPurchaseAmount,
  purchaseAmount,
  purchaseDraft,
  validatePurchaseDraft,
} from "./crm-purchases-form";
import type { CrmPurchaseField, CrmPurchaseRecord } from "./sdk-local/types/crm-purchases.types";
const fields: CrmPurchaseField[] = [
  {
    name: "CLIENTE",
    type: "integer",
    label: "Cliente",
    nullable: true,
    immutable: true,
    requiredOnCreate: true,
  },
  { name: "OPERADOR", type: "integer", label: "Usuário", nullable: true },
  { name: "DATA", type: "date", label: "Data", nullable: true, requiredOnCreate: true },
  { name: "VALOR", type: "decimal", label: "Valor", nullable: true, requiredOnCreate: true },
  {
    name: "DESCRICAO",
    type: "text",
    label: "Descrição",
    nullable: true,
    maxLength: 60,
    requiredOnCreate: true,
  },
  {
    name: "FORMA_PGTO",
    type: "text",
    label: "Forma de pagamento",
    nullable: true,
    maxLength: 255,
    requiredOnCreate: true,
  },
];
const original: CrmPurchaseRecord = {
  CODIGO: 1,
  CLIENTE: 2,
  OPERADOR: 0,
  DATA: "0000-00-00",
  VALOR: "1234.56789012345",
  DESCRICAO: "Anterior",
  FORMA_PGTO: null,
  FATURADO: null,
  TIPO: null,
  SITUACAO: "F",
  CLIENTEATIVO: 0,
};
describe("purchases form preserves physical DOUBLE and typed relations", () => {
  it("accepts BR decimal input with exact string normalization and rejects malformed grouping", () => {
    expect(purchaseAmount("1.234,56")).toBe("1234.56");
    expect(purchaseAmount("00012.5")).toBe("12.50");
    for (const input of ["1.2,34", "1.234", "1e3", "0", "-2,50", "1,234", "Infinity"])
      expect(purchaseAmount(input)).toBeNull();
  });
  it("does not round a historical DOUBLE or force correction of unrelated historical values", () => {
    expect(displayPurchaseAmount(original.VALOR)).toBe("R$ 1.234,56789012345");
    const result = validatePurchaseDraft(
      { ...purchaseDraft(original), DESCRICAO: "Corrigida" },
      fields,
      original,
    );
    expect(result.valid).toBe(true);
    expect(result.changes).toEqual({ DESCRICAO: "Corrigida" });
  });
  it("preserves null versus zero until an explicit relation clear", () => {
    expect(validatePurchaseDraft(purchaseDraft(original), fields, original).changes).toEqual({});
    expect(
      validatePurchaseDraft({ ...purchaseDraft(original), OPERADOR: "" }, fields, original).changes,
    ).toEqual({ OPERADOR: null });
  });
  it("keeps customer immutable and does not send read-only columns on edit", () => {
    expect(
      validatePurchaseDraft({ ...purchaseDraft(original), CLIENTE: "999" }, fields, original)
        .changes,
    ).toEqual({});
  });
  it("validates date boundaries, text capabilities and the server's safe amount limit", () => {
    const draft = {
      CLIENTE: "2",
      OPERADOR: "",
      DATA: "2026-02-28",
      VALOR: "12,50",
      DESCRICAO: "Compra nova",
      FORMA_PGTO: "PIX",
    };
    expect(validatePurchaseDraft(draft, fields).changes).toEqual({
      CLIENTE: 2,
      DATA: "2026-02-28",
      VALOR: "12.50",
      DESCRICAO: "Compra nova",
      FORMA_PGTO: "PIX",
    });
    expect(
      validatePurchaseDraft({ ...draft, DATA: "2026-02-30" }, fields).errors.DATA,
    ).toBeTruthy();
    expect(
      validatePurchaseDraft({ ...draft, VALOR: "1000000000000,00" }, fields).errors.VALOR,
    ).toBeTruthy();
    expect(
      validatePurchaseDraft({ ...draft, DESCRICAO: "😀" }, fields).errors.DESCRICAO,
    ).toBeTruthy();
  });
});
