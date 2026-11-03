import { describe, it, expect } from "vitest";
import { crmPhoneSlots, crmPhonePayload } from "./crm-phone-form";
import { crmFormPayload } from "./crm-customer-form";
import type { CustomerCrmField } from "./sdk-local/types/customer-crm.types";
const fields: CustomerCrmField[] = crmPhoneSlots.flat().map(name => ({ name, label: name, group: "phones", type: name.startsWith("AREA") ? "integer" : "text", nullable: true, maxLength: 100 }));
const original = { AREA1: 11, FONE1: "33333333", DESC_FONE1: "Primeiro", OBS_FONE1: "obs-1", AREA2: 21, FONE2: "44444444", DESC_FONE2: "Segundo", OBS_FONE2: "obs-2", AREAFAX: 31, FAX: "55555555", DESCFAX: "Quarto", OBS_FAX: null };
describe("N01 form rules shared by full registration and operational ficha", () => {
  it.each(crmPhoneSlots)("rejects number without DDD and DDD without number in %s/%s", (area, phone) => {
    for (const value of [{ [area]: 11, [phone]: null }, { [area]: null, [phone]: "33333333" }]) expect(Object.keys(crmPhonePayload(fields, value, original).errors)).toContain(phone);
  });
  it("compacts all metadata when deleting the first phone, including the fourth bundle", () => {
    const result = crmFormPayload(fields, { ...original, AREA1: null, FONE1: null }, original);
    expect(result.valid).toBe(true);
    expect(result.values).toMatchObject({ AREA1: 21, FONE1: "44444444", DESC_FONE1: "Segundo", OBS_FONE1: "obs-2", AREA2: 31, FONE2: "55555555", DESC_FONE2: "Quarto", OBS_FONE2: null, AREAFAX: null, FAX: null, DESCFAX: null });
  });
  it("requires one complete phone but permits creation with only the former fax", () => {
    expect(crmFormPayload(fields, {}).valid).toBe(false);
    expect(crmFormPayload(fields, { AREAFAX: 11, FAX: "33333333", DESCFAX: "Comercial" }).values).toMatchObject({ AREA1: 11, FONE1: "33333333", DESC_FONE1: "Comercial", FAX: null });
    expect(crmFormPayload(fields, { AREA1: null, FONE1: null }, { AREA1: 11, FONE1: "33333333" }).valid).toBe(false);
  });
  it("validates operational drafts without moving hidden observations twice", () => {
    expect(crmPhonePayload(fields, { AREA1: null, FONE1: null }, original, false)).toEqual({ values: {}, errors: {} });
  });
  it("leaves old invalid numbers untouched on unrelated edits and blocks metadata edits until corrected", () => {
    const legacy = { AREA1: 11, FONE1: "", DESC_FONE1: "Legado" };
    expect(crmPhonePayload(fields, { RAZAO: "Nome" }, legacy)).toEqual({ values: {}, errors: {} });
    expect(crmPhonePayload(fields, { DESC_FONE1: "Mudou" }, legacy).errors.FONE1).toBeTruthy();
  });
  it("refuses metadata that cannot fit the destination, rather than truncating it", () => {
    const narrow = fields.map(field => field.name === "DESC_FONE1" ? { ...field, maxLength: 2 } : field);
    expect(crmPhonePayload(narrow, { AREA1: null, FONE1: null }, original).errors.DESC_FONE1).toBeTruthy();
  });
});
