import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/services/customers.service", () => ({ default: {} }));
import { availabilityError } from "./availability";
const data = { periods: [{start:"08:00",end:"12:00"},{start:"13:00",end:"18:00"}], appointments:["2099-01-01T09:00"], dailyLimit:1,blockDailyLimit:false };
describe("seleção de horário", () => {
  it("aceita expediente e mantém sobreposição quando não há bloqueio", () => expect(availabilityError(data,"2099-01-01T09:00")).toBeNull());
  it("exclui almoço, fim do turno e horários fora do expediente", () => {
    for (const t of ["07:59","12:00","12:30","18:00"]) expect(availabilityError(data,`2099-01-01T${t}`)).toBeTruthy();
  });
  it("bloqueia um dia cheio somente quando configurado", () => {
    expect(availabilityError({...data,blockDailyLimit:true},"2099-01-01T10:00")).toContain("limite diário");
    expect(availabilityError({...data,blockDailyLimit:true},"2099-01-02T10:00")).toBeNull();
  });
  it("recusa passado e usuário sem turno", () => {
    expect(availabilityError(data,"2000-01-01T09:00")).toBeTruthy();
    expect(availabilityError({...data,periods:[]},"2099-01-01T09:00")).toBeTruthy();
  });
});
