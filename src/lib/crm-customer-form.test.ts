import { describe, expect, it } from "vitest";
import { crmErrorDetails, crmFormPayload } from "./crm-customer-form";
import type { CustomerCrmField } from "./sdk-local/types/customer-crm.types";
const fields: CustomerCrmField[] = [
  {
    name: "RAZAO",
    label: "Nome",
    group: "identification",
    type: "text",
    nullable: false,
    required: true,
    maxLength: 100,
  },
  {
    name: "GRUPO",
    label: "Grupo",
    group: "origin",
    type: "integer",
    nullable: true,
    lookup: "customer-groups",
  },
  { name: "EMAIL", label: "E-mail", group: "phones", type: "text", nullable: true, maxLength: 150 },
];
describe("CRM registration form snapshots", () => {
  it("omits untouched new fields and preserves database defaults", () => {
    expect(crmFormPayload(fields, { RAZAO: " Ação " }).values).toEqual({ RAZAO: "Ação" });
  });
  it("preserves unchanged legacy NULL, zero and unusual text", () => {
    const original = { RAZAO: "  Legado\u0080  ", GRUPO: 0, EMAIL: null };
    expect(crmFormPayload(fields, { ...original }, original).values).toEqual({});
    expect(crmFormPayload(fields, { ...original, GRUPO: null }, original).values).toEqual({
      GRUPO: null,
    });
  });
  it("clears optional fields explicitly while protecting required name", () => {
    const original = { RAZAO: "A", GRUPO: 3, EMAIL: "a@a.com" };
    expect(crmFormPayload(fields, { ...original, EMAIL: null }, original).values).toEqual({
      EMAIL: null,
    });
    expect(crmFormPayload(fields, { ...original, RAZAO: null }, original).valid).toBe(false);
  });
  it.each([0, -1, 1.5, 2147483648, undefined])(
    "requires valid manual contact identity %s",
    (code) => {
      expect(crmFormPayload(fields, { RAZAO: "A", CODIGO: code }, undefined, true).valid).toBe(
        false,
      );
    },
  );
  it("accepts explicit manual code and never copies arbitrary row fields into mutations", () => {
    expect(
      crmFormPayload(fields, { RAZAO: "A", CODIGO: 25, SALDO: 5 }, undefined, true).values,
    ).toEqual({ CODIGO: 25, RAZAO: "A" });
  });
  it.each(["€", "X".repeat(101), ""])("rejects invalid new name %s", (name) => {
    expect(crmFormPayload(fields, { RAZAO: name }).valid).toBe(false);
  });
  it("distinguishes clear, omission and invalid numeric sentinel", () => {
    expect(crmFormPayload(fields, { RAZAO: "A", GRUPO: null }).values.GRUPO).toBeNull();
    expect(crmFormPayload(fields, { RAZAO: "A", GRUPO: 0 }).valid).toBe(false);
  });
  it("validates actual date values and preserves valid leap dates", () => {
    const date: CustomerCrmField = {
      name: "DATE",
      label: "Data",
      group: "identification",
      type: "date",
      nullable: true,
    };
    expect(crmFormPayload([date], { DATE: "2025-02-29" }).valid).toBe(false);
    expect(crmFormPayload([date], { DATE: "2024-02-29" }).valid).toBe(true);
  });
  it("reads error codes through ApiClient cause without guessing from message", () => {
    expect(
      crmErrorDetails(
        new Error("wrapped", {
          cause: {
            response: { status: 409, data: { code: "CRM_REGISTRATION_CHANGED", message: "Mudou" } },
          },
        }),
      ),
    ).toMatchObject({ status: 409, code: "CRM_REGISTRATION_CHANGED", message: "Mudou" });
    expect(crmErrorDetails(new Error("network"))).not.toHaveProperty("status");
  });
});
