import { expect, test, type Page } from "@playwright/test";

async function selectSegment(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Segmento", exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/customer-segments/index.html?selector");
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Atacado (1)",
  );
});

test("selects and saves an existing segment with the original customer assignment", async ({
  page,
}) => {
  await selectSegment(page, "Varejo (3)");
  await page.getByRole("button", { name: "Salvar segmento", exact: true }).click();
  await expect(page.getByTestId("current-customer-segment")).toContainText("3 · Varejo");
  expect(await page.evaluate(() => window.segmentTest.assignments)).toEqual([
    { id: 40, data: { SEGMENTO: 3, expected: { SEGMENTO: 1 } } },
  ]);
  await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Clear", exact: true })).toHaveCount(0);
});

for (const code of ["CUSTOMER_SEGMENT_CONFLICT", "CUSTOMER_SEGMENT_WRITE_UNKNOWN"]) {
  test(`requires authoritative reload after ${code}`, async ({ page }) => {
    await page.evaluate((code) => {
      window.segmentTest.assignmentError = code;
    }, code);
    await selectSegment(page, "Varejo (3)");
    await page.getByRole("button", { name: "Salvar segmento", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Confira os dados atuais");
    await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toBeDisabled();
    await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
      "Varejo (3)",
    );
    await page.evaluate(() => {
      window.segmentTest.failReload = true;
    });
    await page.getByRole("button", { name: "Recarregar cliente", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Não foi possível recarregar o cliente");
    await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toBeDisabled();
    await page.evaluate(() => {
      window.segmentTest.failReload = false;
      window.segmentTest.customer = { CODIGO: 40, SEGMENTO: 3, NOME: "Varejo" };
    });
    await page.getByRole("button", { name: "Recarregar cliente", exact: true }).click();
    await expect(page.getByTestId("current-customer-segment")).toContainText("3 · Varejo");
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(await page.evaluate(() => window.segmentTest.assignments.length)).toBe(1);
  });
}

test("preserves a historic missing option and refreshes names for the current tenant", async ({
  page,
}) => {
  await page.goto("/tests/customer-segments/index.html?selector&dangling");
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Histórico (99)",
  );
  await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toBeDisabled();
  const reads = await page.evaluate(() => window.segmentTest.lookupReads);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("inpulse:customer-segments-changed", {
        detail: { instance: "another-tenant" },
      }),
    ),
  );
  expect(await page.evaluate(() => window.segmentTest.lookupReads)).toBe(reads);
  await page.evaluate(() => {
    window.segmentTest.rows.find((row) => row.CODIGO === 3)!.NOME = "Varejo atualizado";
    window.dispatchEvent(
      new CustomEvent("inpulse:customer-segments-changed", {
        detail: { instance: "local-fixture" },
      }),
    );
  });
  await selectSegment(page, "Varejo atualizado (3)");
  await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toBeEnabled();
});

test("ignores a delayed save from a previously opened customer", async ({ page }) => {
  await page.evaluate(() => {
    window.segmentTest.assignmentDelay = 1000;
  });
  await selectSegment(page, "Varejo (3)");
  await page.getByRole("button", { name: "Salvar segmento", exact: true }).click();
  await page.getByRole("button", { name: "Abrir cliente 41", exact: true }).click();
  await expect(page.getByRole("heading")).toContainText("#41");
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Atacado (1)",
  );
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.segmentTest.savedCallbacks)).toBe(0);
  await expect(page.getByTestId("current-customer-segment")).toContainText("1 · Atacado");
});

test("shows read-only metadata without loading editable lookup", async ({ page }) => {
  await page.goto("/tests/customer-segments/index.html?selector&readonly");
  await expect(page.getByRole("textbox", { name: "Segmento", exact: true })).toHaveValue("Atacado");
  await expect(page.getByRole("textbox", { name: "Segmento", exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.lookupReads)).toBe(0);
});
