import { describe, expect, it } from "vitest";
import { UserRole } from "@/lib/sdk-local";
import { availableReports, REPORT_CATALOG, searchReports } from "./catalog";

describe("report discovery and authorization", () => {
  it("has unique stable IDs and destinations, without promoting hidden tools or demo data", () => {
    for (const field of ["id", "href"] as const)
      expect(new Set(REPORT_CATALOG.map((report) => report[field])).size).toBe(
        REPORT_CATALOG.length,
      );
    expect(
      REPORT_CATALOG.some((report) =>
        /salesFunnel|generated|report-generator|mailing-analysis/.test(report.href),
      ),
    ).toBe(false);
  });
  it("preserves role, tenant and effective feature gates, including the old sales-only WhatsApp shortcut", () => {
    const disabled = availableReports({}, UserRole.ADMIN, "odim");
    expect(disabled.map((report) => report.id)).not.toContain("sales");
    expect(disabled.map((report) => report.id)).not.toContain("satisfaction");
    expect(availableReports({}, UserRole.ADMIN, "exatron").map((report) => report.id)).toContain(
      "satisfaction",
    );
    const enabled = {
      feature_sales_reports_enabled: "true",
      feature_reports_advanced_enabled: "true",
      feature_chat_export_enabled: "true",
    };
    expect(availableReports(enabled, UserRole.ACTIVE, "exatron")).toEqual([]);
    expect(availableReports(enabled, UserRole.EXTERNAL, "exatron")).toEqual([]);
    expect(availableReports(enabled, null, "exatron")).toEqual([]);
    expect(
      availableReports({ feature_sales_reports_enabled: "true" }, UserRole.ADMIN, "homolog").map(
        (report) => report.id,
      ),
    ).not.toContain("operator-performance");
    expect(availableReports(enabled, UserRole.ADMIN, "homolog").map((report) => report.id)).toEqual(
      expect.arrayContaining(["sales", "operator-performance", "chats"]),
    );
  });
  it("searches accents, aliases, categories and multiple terms only within the visible set", () => {
    const visible = availableReports(
      { feature_reports_advanced_enabled: "true", feature_sales_reports_enabled: "true" },
      UserRole.ADMIN,
      "exatron",
    );
    expect(searchReports(visible, "SATISFACAO").map((report) => report.id)).toEqual([
      "satisfaction",
    ]);
    expect(searchReports(visible, "dashboard financeiro").map((report) => report.id)).toEqual([
      "sales",
    ]);
    expect(
      searchReports(visible, "mensagens operador", "attendance").map((report) => report.id),
    ).toEqual(["messages-per-user"]);
    expect(searchReports(visible, "operador", "quality")).toEqual([]);
  });
});
