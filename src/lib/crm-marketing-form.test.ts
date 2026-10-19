import { describe, expect, it } from "vitest";
import { crmDraft, crmExpected, crmPayload } from "./crm-marketing-form";
import type { CrmMarketingField } from "./sdk-local/types/crm-marketing.types";
const fields: CrmMarketingField[] = [
  { key: "NOME", type: "text", nullable: true, defaultValue: null, maxLength: 50, readOnly: false },
  {
    key: "PRIORIDADE",
    type: "number",
    nullable: true,
    defaultValue: 0,
    min: -2147483648,
    max: 2147483647,
    readOnly: false,
  },
  {
    key: "DATA_INI",
    type: "datetime",
    nullable: true,
    defaultValue: "0000-00-00 00:00:00",
    readOnly: false,
  },
  { key: "SQL_CAMPANHA", type: "text", nullable: true, defaultValue: null, readOnly: true },
];
describe("CRM marketing forms", () => {
  it("starts a usable new name and nullable date without turning the legacy zero date into a new date", () =>
    expect(crmDraft(fields)).toEqual({
      CODIGO: "",
      NOME: "",
      PRIORIDADE: "0",
      DATA_INI: null,
      SQL_CAMPANHA: null,
    }));
  it("preserves legacy descriptions, nulls, zeros and read-only fields in the full snapshot", () => {
    const row = {
        CODIGO: 0,
        NOME: "\u0080",
        PRIORIDADE: 0,
        DATA_INI: "0000-00-00 00:00:00",
        SQL_CAMPANHA: "SELECT legacy",
      },
      draft = crmDraft(fields, row);
    draft["PRIORIDADE"] = "2";
    expect(crmPayload(fields, draft, row)).toEqual({ PRIORIDADE: 2 });
    expect(crmExpected(fields, row)).toEqual({
      NOME: "\u0080",
      PRIORIDADE: 0,
      DATA_INI: "0000-00-00 00:00:00",
      SQL_CAMPANHA: "SELECT legacy",
    });
  });
  it("keeps explicit null separate from zero and never writes readonly SQL", () => {
    const row = { CODIGO: 1, NOME: "A", PRIORIDADE: 0, DATA_INI: null, SQL_CAMPANHA: null },
      draft = crmDraft(fields, row);
    draft["PRIORIDADE"] = null;
    draft["SQL_CAMPANHA"] = "DROP TABLE";
    expect(crmPayload(fields, draft, row)).toEqual({ PRIORIDADE: null });
  });
  it.each(["€", "😀", "\u0080"])("rejects unrepresentable new name %s", (NOME) =>
    expect(() => crmPayload(fields, { ...crmDraft(fields), CODIGO: "1", NOME })).toThrow(),
  );
  it.each(["0", "-1", "01", "1.5", "2147483648"])("rejects invalid new identity %s", (CODIGO) =>
    expect(() => crmPayload(fields, { ...crmDraft(fields), CODIGO, NOME: "A" })).toThrow(),
  );
  it.each(["2026-02-30 10:00:00", "0000-00-00 00:00:00", "2026-10-19 24:00:00"])(
    "rejects invalid new civil date %s",
    (DATA_INI) =>
      expect(() =>
        crmPayload(fields, { ...crmDraft(fields), CODIGO: "1", NOME: "A", DATA_INI }),
      ).toThrow(),
  );
});
