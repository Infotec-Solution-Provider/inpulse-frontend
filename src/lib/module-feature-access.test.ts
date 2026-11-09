import { describe, expect, it } from "vitest";
import { FEATURE_FLAGS as F } from "./feature-flags";
import { canAccessFeaturePath, featureRoute, ROUTE_FEATURE_FLAGS } from "./module-feature-access";
import { crudsRoutes, getNavigationItems, navigationLeaves } from "./ui-system/navigation";
import { UserRole } from "./sdk-local";

describe("new module rollout", () => {
  it.each(ROUTE_FEATURE_FLAGS)("denies $segment by default, including detail URLs and nova prefix", ({ segment, flags }) => {
    for (const path of [segment, `${segment}/42`, `/odim${segment}`, `/nova/odim${segment}/42?tab=details`]) {
      const instance = path.startsWith("/odim/") || path.startsWith("/nova/") ? "odim" : undefined;
      expect(canAccessFeaturePath({}, path, instance)).toBe(false);
      const enabled = Object.fromEntries(flags.map(flag => [flag, "true"]));
      expect(canAccessFeaturePath(enabled, path, instance)).toBe(true);
      expect(canAccessFeaturePath(Object.fromEntries(flags.map(flag => [flag, "TRUE"])), path, instance)).toBe(false);
    }
  });

  it("keeps basic customers, users, chats and conversation monitoring available", () => {
    for (const route of ["/", "/customers", "/users", "/monitor", "/contacts", "/wallets"]) {
      expect(canAccessFeaturePath({}, `/nova/odim${route}`, "odim")).toBe(true);
    }
  });

  it("matches route boundaries, never query text or tenant names", () => {
    expect(featureRoute("/crm-customers-old")).toBeUndefined();
    expect(featureRoute("/customers?next=/crm-customers")).toBeUndefined();
    expect(featureRoute("/crm-email/customers", "crm-email")).toBeUndefined();
    expect(featureRoute("/crm-emailish")).toBeUndefined();
    expect(featureRoute("/crm-campaigns/9/configure")?.flags).toEqual([F.crmUnitsCampaigns]);
  });

  it("uses the same module gates for legacy header and modern menus, pruning empty groups", () => {
    const modern = getNavigationItems({}, UserRole.ADMIN, "odim");
    const legacy = crudsRoutes({}, true, UserRole.ADMIN);
    const disabled = ["/crm-imports", "/crm-email", "/crm-units", "/crm-purchases", "/parameters", "/contact-requests"];
    for (const path of disabled) {
      expect(navigationLeaves(modern).some(item => item.href.split("?")[0] === path)).toBe(false);
      expect(legacy.some(item => item.href === path)).toBe(false);
    }
    expect(modern.find(item => item.id === "campaigns")).toBeUndefined();
    const enabled = navigationLeaves(getNavigationItems({ [F.crmSales]: "true" }, UserRole.ADMIN, "odim"));
    expect(enabled.map(item => item.href)).toEqual(expect.arrayContaining(["/crm-purchases", "/crm-proposals"]));
    expect(enabled.map(item => item.href)).not.toContain("/user-catalogs/sales-types");
  });

  it("does not turn feature flags into permissions", () => {
    const enabled = Object.fromEntries(Object.values(F).map(flag => [flag, "true"]));
    expect(navigationLeaves(getNavigationItems(enabled, UserRole.EXTERNAL, "odim")).map(item => item.href)).toEqual(["/"]);
    expect(navigationLeaves(getNavigationItems(enabled, UserRole.ACTIVE, "odim")).map(item => item.href)).not.toContain("/parameters");
  });

  it("reuses report flags for generated reports without enabling sales maintenance", () => {
    expect(canAccessFeaturePath({ [F.reportsDashboards]: "true" }, "/reports/generated/private-report")).toBe(true);
    expect(canAccessFeaturePath({ [F.salesReports]: "true" }, "/crm-purchases")).toBe(false);
    expect(canAccessFeaturePath({ [F.crmSales]: "true" }, "/reports/sales")).toBe(false);
    expect(canAccessFeaturePath({ [F.whatsappSessionMonitoring]: "true" }, "/channels")).toBe(true);
  });
});
