import { describe, expect, it } from "vitest";
import { UserRole } from "@/lib/sdk-local";
import {
  getNavigationItems,
  navigationLeaves,
  activeNavigationPath,
  isModernCrmPath,
  isMonitorPath,
  isNavigationRouteActive,
  sidebarExpandedPreference,
  sidebarStorageKey,
} from "./navigation";

const routes = (role: UserRole, parameters: Record<string, string> = {}, instance = "homolog") =>
  navigationLeaves(getNavigationItems(parameters, role, instance)).map((item) => item.href);

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
        "/crm-purchases",
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
  it("preserves existing goals destinations and their feature and role gates alongside CRM", () => {
    const enabled = routes(UserRole.ADMIN, { feature_reports_advanced_enabled: "true" });
    expect(enabled).toEqual(
      expect.arrayContaining([
        "/reports/goals-dashboard",
        "/reports/team-goals",
        "/user-catalogs/user-groups",
        "/crm-campaigns",
      ]),
    );
    expect(routes(UserRole.ADMIN)).not.toContain("/reports/goals-dashboard");
    expect(routes(UserRole.ACTIVE, { feature_reports_advanced_enabled: "true" })).not.toContain(
      "/reports/team-goals",
    );
    expect(enabled.some((path) => /operadores_meta|crm-goals/.test(path))).toBe(false);
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

describe("hierarchical application navigation", () => {
  const tree = getNavigationItems({}, UserRole.ADMIN, "homolog");
  it("uses unique stable identities, expandable groups and direct catalog destinations", () => {
    const ids: string[] = [];
    const inspect = (nodes: typeof tree) =>
      nodes.forEach((node) => {
        ids.push(node.id);
        if (node.kind === "group") {
          expect(node.href).toBeUndefined();
          expect(node.routes.length).toBeGreaterThan(0);
          inspect(node.routes);
        }
      });
    inspect(tree);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["customers", "users"]) {
      const group = tree.find((item) => item.id === id)!;
      expect(group.routes?.[0].title).toBe("Cadastro");
    }
    expect(navigationLeaves(tree).map((item) => item.href)).not.toContain("/crm-catalogs");
    expect(navigationLeaves(tree).map((item) => item.href)).not.toContain("/user-catalogs");
  });
  it("opens the exact ancestor chain for sales and customer detail aliases", () => {
    expect(
      activeNavigationPath(tree, "/homolog/user-catalogs/sales-types", "homolog").map(
        (item) => item.id,
      ),
    ).toEqual(["users", "sales", "sales-types"]);
    expect(
      activeNavigationPath(tree, "/homolog/crm-customers/42", "homolog").map((item) => item.id),
    ).toEqual(["customers", "customers-register"]);
  });
  it("selects one exception, including missing and invalid kind, without selecting all tabs", () => {
    for (const [query, leaf] of [
      ["kind=states", "exception-states"],
      ["kind=customers", "exception-customers"],
      ["", "exception-cities"],
      ["kind=invalid", "exception-cities"],
    ]) {
      expect(
        activeNavigationPath(tree, "/homolog/crm-exceptions", "homolog", query).map(
          (item) => item.id,
        ),
      ).toEqual(["campaigns", "exceptions", leaf]);
    }
  });
  it("prefers a query-specific report and respects route boundaries and visual scope", () => {
    expect(
      activeNavigationPath(
        getNavigationItems({}, UserRole.ADMIN, "exatron"),
        "/exatron/reports/dashboard",
        "exatron",
        "report=satisfactionSurvey",
      ).at(-1)?.title,
    ).toBe("Pesquisa de Satisfação");
    expect(isModernCrmPath("/homolog/crm-customers/12")).toBe(true);
    expect(isModernCrmPath("/homolog/customers-old")).toBe(false);
    expect(isModernCrmPath("/homolog/reports/dashboard")).toBe(false);
  });
});
