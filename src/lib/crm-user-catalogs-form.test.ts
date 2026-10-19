import { describe, expect, it } from "vitest";
import { CRM_USER_CATALOGS } from "./crm-user-catalogs-form";
import {
  catalogDefinitionDraft,
  catalogDefinitionExpected,
  validateCatalogDefinition,
} from "./crm-catalogs-form";
import { userRegistrationDraft, validateUserRegistration } from "./crm-user-registration-form";
import type {
  CrmUserRegistrationField,
  CrmUserRegistrationDetail,
} from "./sdk-local/types/crm-users.types";
describe("user CRM catalog preservation", () => {
  const shifts = CRM_USER_CATALOGS.shifts;
  const original = {
    CODIGO: 4,
    DESCRICAO: "Noturno",
    HORARIO_1: "SIM",
    ENTRADA_1: "23:30:00",
    SAIDA_1: "04:15:00",
    HORARIO_2: null,
    ENTRADA_2: "-838:59:59",
    SAIDA_2: null,
    HORARIO_3: "NAO",
    ENTRADA_3: "00:00:00",
    SAIDA_3: "00:00:00",
  };
  it("changes a flag without deleting its times or normalizing historical durations", () => {
    const result = validateCatalogDefinition(
      shifts,
      { ...catalogDefinitionDraft(shifts, original), HORARIO_1: "NAO" },
      original,
    );
    expect(result).toMatchObject({ valid: true, changes: { HORARIO_1: "NAO" } });
    expect(catalogDefinitionExpected(shifts, original)).toMatchObject({
      ENTRADA_2: "-838:59:59",
      ENTRADA_1: "23:30:00",
      SAIDA_1: "04:15:00",
    });
  });
  it("accepts overnight periods and rejects a new invalid clock", () => {
    expect(
      validateCatalogDefinition(shifts, {
        CODIGO: "5",
        DESCRICAO: "Noturno",
        ENTRADA_1: "23:30:00",
        SAIDA_1: "04:15:00",
      }).valid,
    ).toBe(true);
    expect(
      validateCatalogDefinition(
        shifts,
        { ...catalogDefinitionDraft(shifts, original), ENTRADA_2: "24:00:00" },
        original,
      ).errors.ENTRADA_2,
    ).toBeTruthy();
  });
  it("keeps sales code zeroes and decimal strings without inventing a unit", () => {
    const sales = CRM_USER_CATALOGS["sales-types"];
    expect(
      validateCatalogDefinition(sales, { ID: "0001", NOME: "Venda", PAGAMENTO: "1,50" }).changes,
    ).toEqual({ ID: "0001", NOME: "Venda", PAGAMENTO: "1.50" });
    expect(
      catalogDefinitionExpected(sales, {
        ID: "0001",
        NOME: "Venda",
        PAGAMENTO: "1.50",
        ID_COUNT: 1,
      }),
    ).toEqual({ ID: "0001", NOME: "Venda", PAGAMENTO: "1.50" });
  });
  it("preserves the distinction between clearing productivity and zero seconds", () => {
    const pause = CRM_USER_CATALOGS["pause-reasons"];
    const before = { CODIGO: 4, DESCRICAO: "Pausa", TEMPO_MAX_SEG: 10, PRODUTIVIDADE: "SIM" };
    expect(
      validateCatalogDefinition(
        pause,
        { ...catalogDefinitionDraft(pause, before), TEMPO_MAX_SEG: "0", PRODUTIVIDADE: "" },
        before,
      ).changes,
    ).toEqual({ TEMPO_MAX_SEG: 0, PRODUTIVIDADE: null });
    expect(
      validateCatalogDefinition(pause, { CODIGO: "4", DESCRICAO: "Pausa", TEMPO_MAX_SEG: "-1" })
        .valid,
    ).toBe(false);
  });
});
describe("user registration draft", () => {
  const fields: CrmUserRegistrationField[] = [
    {
      name: "NOME",
      type: "text",
      label: "Nome",
      group: "Identificação",
      nullable: false,
      maxLength: 50,
      requiredOnCreate: true,
    },
    {
      name: "SENHA",
      type: "password",
      label: "Senha",
      group: "Acesso",
      nullable: false,
      requiredOnCreate: true,
    },
    { name: "SETOR", type: "number", label: "Setor", group: "Organização", nullable: true },
  ];
  const detail: CrmUserRegistrationDetail = {
    record: { CODIGO: 7, NOME: "Maria", SETOR: 0 },
    version: "opaque",
    fields,
  };
  it("never fills a password from a record and omits a blank password on edit", () => {
    const draft = userRegistrationDraft(fields, detail);
    expect(draft.SENHA).toBe("");
    expect(
      validateUserRegistration(fields, { ...draft, NOME: "Maria Silva" }, detail).changes,
    ).toEqual({ NOME: "Maria Silva" });
  });
  it("requires a password on create and clears the zero sector only by explicit change", () => {
    expect(validateUserRegistration(fields, { NOME: "Maria", SENHA: "" }).valid).toBe(false);
    expect(
      validateUserRegistration(
        fields,
        { ...userRegistrationDraft(fields, detail), SETOR: "" },
        detail,
      ).changes,
    ).toEqual({ SETOR: null });
  });
});
