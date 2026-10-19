import { describe, expect, it } from "vitest";
import { UserRole } from "@/lib/sdk-local";
import {
  getNavigationItems,
  isMonitorPath,
  isNavigationRouteActive,
  sidebarExpandedPreference,
  sidebarStorageKey,
} from "./navigation";

const routes = (role: UserRole, parameters: Record<string, string> = {}, instance = "homolog") =>
  getNavigationItems(parameters, role, instance).flatMap((item) =>
    item.href ? [item.href] : (item.routes?.map((route) => route.href) ?? []),
  );

describe("shared navigation authorization", () => {
  it("does not expose administration or internal groups to external operators", () => {
    expect(
      routes(UserRole.EXTERNAL, {
        feature_ai_enabled: "true",
        feature_ai_agents_enabled: "true",
        feature_funnels_enabled: "true",
      }),
    ).toEqual(["/"]);
  });
  it("preserves administrator destinations and gates optional functionality", () => {
    const base = routes(UserRole.ADMIN);
    expect(base).toEqual(
      expect.arrayContaining([
        "/monitor",
        "/customers",
        "/parameters",
        "/users",
        "/reports/dashboard",
        "/changelog",
      ]),
    );
    expect(base).not.toContain("/channels");
    expect(base).not.toContain("/sip-config");
    expect(base).not.toContain("/ai-agents");
    const enabled = routes(UserRole.ADMIN, {
      feature_whatsapp_session_monitoring_enabled: "true",
      feature_sip_config_enabled: "true",
      feature_ai_enabled: "true",
      feature_ai_agents_enabled: "true",
    });
    expect(enabled).toEqual(expect.arrayContaining(["/channels", "/sip-config", "/ai-agents"]));
  });
  it("preserves tenant-specific reports and parameter restrictions", () => {
    const visible = routes(
      UserRole.ADMIN,
      { disable_contacts_crud: "true", disable_internal_groups: "true" },
      "exatron",
    );
    expect(visible).toContain("/reports/dashboard?report=satisfactionSurvey");
    expect(visible).not.toContain("/contacts");
    expect(visible).not.toContain("/internal-groups");
  });
});

describe("pilot route and scoped navigation preferences", () => {
  it("matches the monitor route segment without changing similar legacy paths", () => {
    expect(isMonitorPath("/homolog/monitor")).toBe(true);
    expect(isMonitorPath("/homolog/monitor/internal-chats")).toBe(true);
    expect(isMonitorPath("/homolog/monitoring")).toBe(false);
    expect(isMonitorPath("/homolog/customers?next=/monitor")).toBe(false);
  });
  it("marks root links only at tenant root and respects route boundaries", () => {
    expect(isNavigationRouteActive("/homolog/monitor", "homolog", "/")).toBe(false);
    expect(isNavigationRouteActive("/homolog/monitor/details", "homolog", "/monitor")).toBe(true);
    expect(isNavigationRouteActive("/homolog/monitoring", "homolog", "/monitor")).toBe(false);
  });
  it("keeps preferences isolated by user and tenant and honors explicit compact mode", () => {
    expect(sidebarStorageKey("tenant:a", 12)).not.toBe(sidebarStorageKey("tenant", "a:12"));
    expect(sidebarStorageKey("a", 12)).not.toBe(sidebarStorageKey("b", 12));
    expect(sidebarStorageKey("a", 12)).not.toBe(sidebarStorageKey("a", 13));
    expect(sidebarExpandedPreference(null, 1279)).toBe(false);
    expect(sidebarExpandedPreference(null, 1280)).toBe(true);
    expect(sidebarExpandedPreference("compact", 1440)).toBe(false);
    expect(sidebarExpandedPreference("expanded", 1024)).toBe(true);
  });
});
