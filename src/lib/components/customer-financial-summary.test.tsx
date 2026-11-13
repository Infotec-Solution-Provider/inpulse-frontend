import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CustomerFinancialSummary, { financialSummaryRows } from "./customer-financial-summary";

describe("customer financial view", () => {
  it("does not render financial values without the server capability", () => {
    const html = renderToStaticMarkup(<CustomerFinancialSummary customer={{ SALDO_DISPONIVEL: 123456 }} />);
    expect(html).toContain("não permite"); expect(html).not.toContain("123456"); expect(html).not.toContain("Saldo disponível");
  });
  it("shows imported values and dates without editable fields or timezone shifts", () => {
    const customer = { SALDO_DISPONIVEL: "1250.5", SALDO_LIMITE: null, POTENCIAL: 0, DATA_ULT_COMPRA: "2026-11-13T00:00:00.000Z", VENCIMENTO_LIMITE_CREDITO: "2026-12-01" };
    const rows = financialSummaryRows(customer); expect(rows[0]?.[1]).toContain("1.250,50"); expect(rows[3]?.[1]).toBe("13/11/2026");
    const html = renderToStaticMarkup(<CustomerFinancialSummary customer={customer} access={{ canViewFinancial: true, canViewPurchases: true }} />);
    expect(html).toContain("01/12/2026"); expect(html).not.toContain("<input");
  });
});
