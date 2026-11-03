import { expect, test, type Page } from "@playwright/test";
import type { GoalAllocation } from "../../src/lib/services/goal-assignments.service";
const participants = [
  { operadorId: 1, name: "Ana" },
  { operadorId: 2, name: "Bruno" },
  { operadorId: 3, name: "Carla" },
];
async function fixture(page: Page, failures: number[] = []) {
  const commits: Array<{ requestId: string }> = [];
  const history: any[] = [];
  await page.route("http://fixture-marketing/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") return respond({});
    expect(request.headers()["x-crm-instance"]).toMatch(/^tenant-[ab]$/);
    if (url.pathname.endsWith("/participants"))
      return respond({
        data: {
          data: participants.filter((person) =>
            person.name
              .toLowerCase()
              .includes((url.searchParams.get("search") ?? "").toLowerCase()),
          ),
          hasNext: false,
        },
      });
    if (url.pathname.endsWith("/preview")) {
      const input = request.postDataJSON() as GoalAllocation;
      const scale = input.indicator === "targetSalesCount" ? 1 : 100,
        units = Math.round(Number(input.amount) * scale);
      const ids = [...input.participants].sort((a, b) => a - b);
      const rows = ids.map((id, index) => ({
        ...participants.find((person) => person.operadorId === id)!,
        previous: null,
        value:
          (input.mode === "INDIVIDUAL"
            ? units
            : Math.floor(units / ids.length) + (index < units % ids.length ? 1 : 0)) / scale,
      }));
      return respond({
        data: {
          rows,
          total: rows.reduce((sum, row) => sum + Math.round(row.value * scale), 0) / scale,
          previewHash: "a".repeat(64),
        },
      });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      commits.push(body);
      const fail = failures.shift();
      if (fail)
        return respond(
          {
            message:
              fail === 409
                ? "As metas mudaram. Gere uma nova prévia."
                : "Resultado desconhecido. Tente novamente.",
          },
          fail,
        );
      return respond({ data: { id: 1 } });
    }
    return respond({ data: history });
  });
  await page.goto("/tests/goals/index.html");
  await expect(page.getByRole("checkbox", { name: "Ana (#1)" })).toBeVisible();
  return commits;
}
async function selectAll(page: Page) {
  for (const name of ["Ana (#1)", "Bruno (#2)", "Carla (#3)"])
    await page.getByRole("checkbox", { name, exact: true }).check();
}
for (const width of [1280, 390])
  test(`individual and total preview with exact sum at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const commits = await fixture(page);
    await expect(page.getByRole("button", { name: "Gerar prévia" })).toBeDisabled();
    await selectAll(page);
    await page.getByLabel("Meta individual de cada participante", { exact: true }).fill("100.00");
    await page.getByRole("button", { name: "Gerar prévia" }).click();
    const preview = page.getByRole("region", { name: "Prévia da atribuição" });
    await expect(preview.getByText("Soma das metas dos participantes: 300,00")).toBeVisible();
    await page.getByLabel("Modo de atribuição").click();
    await page.getByRole("option", { name: "Dividir meta total igualmente" }).click();
    await expect(preview).toHaveCount(0);
    await page.getByRole("button", { name: "Gerar prévia" }).click();
    await expect(preview.getByText("33,34", { exact: true })).toBeVisible();
    await expect(preview.getByText("33,33", { exact: true })).toHaveCount(2);
    await expect(preview.getByText("Soma das metas dos participantes: 100,00")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `${process.env["GOALS_ARTIFACT_DIR"] ?? "test-results-goals"}/preview-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Confirmar atribuição" }).click();
    await expect(page.getByText("Metas atribuídas e histórico registrado.")).toBeVisible();
    expect(commits).toHaveLength(1);
  });
test("unknown outcome reuses operation key; conflict invalidates preview; tenant change clears selection", async ({
  page,
}) => {
  const commits = await fixture(page, [503, 409]);
  await selectAll(page);
  await page.getByLabel("Meta individual de cada participante", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Gerar prévia" }).click();
  await page.getByRole("button", { name: "Confirmar atribuição" }).click();
  await expect(page.getByText("Resultado desconhecido. Tente novamente.")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar atribuição" }).click();
  await expect(page.getByText("As metas mudaram. Gere uma nova prévia.")).toBeVisible();
  expect(commits[0]!.requestId).toBe(commits[1]!.requestId);
  await expect(page.getByRole("region", { name: "Prévia da atribuição" })).toHaveCount(0);
  await page.getByRole("button", { name: "Trocar tenant" }).click();
  await expect(page.getByRole("checkbox", { name: "Ana (#1)" })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Gerar prévia" })).toBeDisabled();
});
test("ticket average allows individual targets only and selection survives participant search", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("checkbox", { name: "Ana (#1)" }).check();
  await page.getByLabel("Buscar participantes por nome ou código").fill("Bruno");
  await expect(page.getByRole("checkbox", { name: "Ana (#1)" })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Bruno (#2)" }).check();
  await page.getByLabel("Indicador", { exact: true }).click();
  await page.getByRole("option", { name: "Ticket médio por participante (R$)" }).click();
  await page.getByLabel("Modo de atribuição").click();
  await expect(page.getByRole("option", { name: "Dividir meta total igualmente" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.getByLabel("Meta individual de cada participante", { exact: true }).fill("50.50");
  await page.getByRole("button", { name: "Gerar prévia" }).click();
  await expect(
    page.getByRole("region", { name: "Prévia da atribuição" }).getByRole("row"),
  ).toHaveCount(3);
});
