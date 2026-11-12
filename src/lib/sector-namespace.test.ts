import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import type { TenantUiPolicy } from "./tenant-ui-policy";
import { approvedWhatsappSectors, assertCrmSectorSelection, crmSectorOptions, resolveSectorNamespace, sectorNamespaceKey, whatsappSectorForCrm } from "./sector-namespace";
import { loadWhatsappSectorSession } from "./whatsapp-sector-bootstrap";

const policy = (): TenantUiPolicy => ({ revision: "reviewed-v2", sharedUserIds: [], excludedOperatorIds: [], canTransferAttendance: true,
  canUseAdminTransferTarget: false, crmSectorId: 1, whatsappSectorId: 12, crmSectorByWhatsappSector: { "12": 1, "13": 2 } });
const sectors = [{ id: 1, name: "Foreign sector", defaultClientId: 99 }, { id: 12, name: "Odim sector", defaultClientId: 27 }];
describe("CRM and WhatsApp sector namespaces", () => {
  it("channel/room scope changes with the approved revision/map, independently of map insertion order", () => {
    const current = policy();
    const key = sectorNamespaceKey("odim", 1, current);
    expect(sectorNamespaceKey("odim", 1, { ...current, crmSectorByWhatsappSector: {"13":2,"12":1} })).toBe(key);
    expect(sectorNamespaceKey("odim", 1, { ...current, revision: "reviewed-v3" })).not.toBe(key);
    expect(sectorNamespaceKey("odim", 1, null)).not.toBe(key);
  });
  it("keeps CRM 1 intact, authorizes WhatsApp 12 and never treats foreign global 1 as CRM 1", () => {
    const user = Object.freeze({ SETOR: 1 });
    const namespace = resolveSectorNamespace("odim", user.SETOR, policy());
    expect(namespace.mode).toBe("mapped"); expect(namespace.whatsappSectorId).toBe(12);
    expect(approvedWhatsappSectors(namespace, sectors)).toEqual([sectors[1]]);
    expect(crmSectorOptions(namespace, sectors)).toEqual([{ id: 1, name: "Odim sector" }]);
    expect(whatsappSectorForCrm(namespace, 1)).toBe(12); expect(whatsappSectorForCrm(namespace, 7)).toBeNull();
    expect(user.SETOR).toBe(1);
  });
  it.each([
    { crmSectorByWhatsappSector: undefined }, { crmSectorByWhatsappSector: {} }, { crmSectorByWhatsappSector: { "12": 1, "13": 1 } },
    { crmSectorByWhatsappSector: { "012": 1 } }, { crmSectorByWhatsappSector: { "12": -1 } },
    { crmSectorId: 12 }, { whatsappSectorId: 1 }, { revision: "" }, { revision: "x".repeat(129) },
  ])("fails closed for an incomplete or ambiguous active Odim capability: %j", patch => {
    const namespace = resolveSectorNamespace("odim", 1, { ...policy(), ...patch } as TenantUiPolicy);
    expect(namespace.mode).toBe("blocked"); expect(namespace.whatsappSectorId).toBeNull();
    expect(crmSectorOptions(namespace, sectors)).toEqual([]); expect(whatsappSectorForCrm(namespace, 1)).toBeNull();
    expect(() => assertCrmSectorSelection(namespace, 1)).toThrow();
  });
  it("preserves policy-off Odim and other tenants without inventing a new namespace", () => {
    for (const [instance, capability] of [["odim", null], ["other", policy()]] as const) {
      const namespace = resolveSectorNamespace(instance, 1, capability);
      expect(namespace.mode).toBe("legacy"); expect(namespace.whatsappSectorId).toBe(1);
      expect(crmSectorOptions(namespace, sectors)).toEqual(sectors.map(({id,name}) => ({id,name})));
      expect(() => assertCrmSectorSelection(namespace, 12)).not.toThrow();
    }
  });
  it("operator writes accept CRM 1 and reject the global WhatsApp ID 12", () => {
    const namespace = resolveSectorNamespace("odim", 1, policy());
    expect(() => assertCrmSectorSelection(namespace, 1)).not.toThrow();
    for (const candidate of [12, null, undefined, "1"]) expect(() => assertCrmSectorSelection(namespace, candidate)).toThrow();
  });
  it("missing Odim capability is not the same as explicit policy-off null", () => {
    expect(resolveSectorNamespace("odim", 1, undefined).mode).toBe("blocked");
    expect(resolveSectorNamespace("odim", 1, null).mode).toBe("legacy");
  });
});

function api(capability: TenantUiPolicy | null = policy(), sectorRows = sectors, after: (url: string) => void = () => {}) {
  const get = vi.fn(async (url: string) => {
    after(url);
    if (url.endsWith("/session/parameters")) return { data: { parameters: {}, tenantPolicy: capability } };
    if (url.endsWith("/sectors")) return { data: { data: sectorRows } };
    return { data: { data: [{ id: 27 }] } };
  });
  return { get, ax: { get } as unknown as Pick<AxiosInstance, "get"> };
}
const session = (isCurrent = () => true) => ({ instance: "odim", crmSectorId: 1, token: "fixture-token", isCurrent });
describe("WhatsApp workspace bootstrap", () => {
  it.each([{}, {parameters:{}}, {tenantPolicy:null}, {parameters:[],tenantPolicy:null}, {parameters:{},tenantPolicy:false}])("malformed Odim metadata cannot fall back to global sector 1: %j", async body => {
    const fixture = api(); fixture.get.mockImplementationOnce(async () => ({data:body}) as any);
    await expect(loadWhatsappSectorSession(fixture.ax, session())).rejects.toThrow();
    expect(fixture.get.mock.calls.map(call => call[0])).toEqual(["/api/whatsapp/session/parameters"]);
  });
  it("loads policy first and requests only approved global sector 12", async () => {
    const fixture = api(); const snapshot = await loadWhatsappSectorSession<{id:number}>(fixture.ax, session());
    expect(fixture.get.mock.calls.map(call => call[0])).toEqual(["/api/whatsapp/session/parameters", "/api/whatsapp/sectors", "/api/whatsapp/sector/12/clients"]);
    expect(snapshot?.sectors).toEqual([sectors[1]]); expect(snapshot?.channels).toEqual([{id:27}]); expect(snapshot?.defaultClientId).toBe(27);
  });
  it("a missing active map aborts before any sector/client query", async () => {
    const fixture = api({ ...policy(), crmSectorByWhatsappSector: {} });
    await expect(loadWhatsappSectorSession(fixture.ax, session())).rejects.toThrow();
    expect(fixture.get.mock.calls.map(call => call[0])).toEqual(["/api/whatsapp/session/parameters"]);
  });
  it.each([{ rows: [sectors[0]!] }, { rows: [sectors[1]!, sectors[1]!] }])("missing or duplicate approved sector cannot fall back to foreign 1: %j", async ({ rows }) => {
    const fixture = api(policy(), rows);
    await expect(loadWhatsappSectorSession(fixture.ax, session())).rejects.toThrow();
    expect(fixture.get.mock.calls.some(call => call[0].includes("/clients"))).toBe(false);
  });
  it.each(["/session/parameters", "/sectors"])("tenant change or logout while reading %s prevents the next request", async ending => {
    let current = true; const fixture = api(policy(), sectors, url => { if (url.endsWith(ending)) current = false; });
    expect(await loadWhatsappSectorSession(fixture.ax, session(() => current))).toBeNull();
    expect(fixture.get.mock.calls.some(call => call[0].includes("/clients"))).toBe(false);
  });
  it("policy-off keeps the old sector URL", async () => {
    const fixture = api(null); await loadWhatsappSectorSession(fixture.ax, session());
    expect(fixture.get.mock.calls.at(-1)?.[0]).toBe("/api/whatsapp/sector/1/clients");
  });
});
