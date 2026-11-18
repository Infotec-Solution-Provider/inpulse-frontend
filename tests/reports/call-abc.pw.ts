import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("Curva ABC generates with applied filters and exports every ranked row", async ({ page }) => {
  const requests: URL[] = [];
  let fail = false;
  await page.route("http://fixture-reports/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,OPTIONS",
    };
    const reply = (data: unknown, status = 200) => route.fulfill({ headers, status, json: data });
    if (req.method() === "OPTIONS") return reply({});
    expect(req.headers()["x-crm-instance"]).toBe("tenant-a");
    expect(req.headers().authorization).toBe("Bearer tenant-a");
    if (url.pathname.endsWith("/brands-enabled")) return reply({ data: true });
    if (url.pathname.endsWith("/options"))
      return reply({ data: { options: [{ id: 95, label: "Marca Sul" }], hasMore: false } });
    requests.push(url);
    if (fail) return reply({ message: "Fonte indisponível" }, 503);
    return reply({
      data: {
        rows: [
          { campaignType: "ATIVOS", outbound: 12, inbound: 2, contacts: 9, sales: 4 },
          { campaignType: "PROSPE", outbound: 4, inbound: 0, contacts: 1, sales: 1 },
        ],
        totals: { outbound: 16, inbound: 2, contacts: 10, sales: 5 },
      },
    });
  });
  await page.goto("/tests/reports/index.html");
  await expect(page.getByRole("link", { name: /Curva ABC de ligações/ })).toBeVisible();
  await page.getByRole("button", { name: "Curva ABC", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Curva ABC de ligações" })).toBeVisible();
  await page.getByRole("combobox", { name: "Agrupar por" }).click();
  await page.getByRole("option", { name: "Tipo de campanha", exact: true }).click();
  await page.getByRole("combobox", { name: "Ordenar por" }).click();
  await page.getByRole("option", { name: "Vendas", exact: true }).click();
  await page.getByRole("combobox", { name: "Marcas" }).fill("95");
  await page.getByRole("option", { name: /Marca Sul/ }).click();
  await page.keyboard.press("Escape");
  expect(requests).toHaveLength(0);

  await page.getByRole("button", { name: "Gerar relatório" }).click();
  const table = page.getByRole("table");
  await expect(table.getByRole("cell", { name: "Ativos", exact: true })).toBeVisible();
  expect(requests[0].searchParams.get("group")).toBe("campaignType");
  expect(requests[0].searchParams.get("metric")).toBe("sales");
  expect(requests[0].searchParams.get("brandIds")).toBe("95");
  await expect(table.getByRole("columnheader", { name: "Cliente", exact: true })).toHaveCount(0);

  await page.getByRole("textbox", { name: "Pesquisar nos resultados" }).fill("Ativos");
  await expect(table.getByRole("cell", { name: "Prospects" })).toHaveCount(0);
  const exportButton = page.getByRole("button", { name: "Exportar CSV" });
  const pending = page.waitForEvent("download");
  await exportButton.click();
  const csv = await readFile((await (await pending).path())!, "utf8");
  expect(csv).toContain("Prospects");

  await page.getByRole("spinbutton", { name: "Limite de registros" }).fill("5");
  await expect(exportButton).toBeDisabled();
  fail = true;
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(page.getByText("Fonte indisponível")).toBeVisible();
  await expect(exportButton).toBeDisabled();
  await expect(table.getByRole("cell", { name: "Ativos", exact: true })).toBeVisible();
});
