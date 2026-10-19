import { expect, test, type Page } from "@playwright/test";

async function openOrigin(page: Page) {
  await page.getByRole("tab", { name: "Origem", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toBeVisible();
}

async function chooseSegment(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Segmento", exact: true }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

async function unknownAssignment(page: Page) {
  await page.evaluate(() => {
    window.segmentTest.assignmentError = "CUSTOMER_SEGMENT_WRITE_UNKNOWN";
  });
  await chooseSegment(page, "Varejo (3)");
  await page.getByRole("button", { name: "Salvar segmento", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recarregar cliente", exact: true })).toBeVisible();
}

test("real customer modal preserves the reload gate across tab unmounts", async ({ page }) => {
  await page.goto("/tests/customer-segments/index.html?modal");
  await expect(page.getByRole("textbox", { name: "Razão Social", exact: true })).toHaveValue(
    "Cliente 40",
  );
  await openOrigin(page);
  await unknownAssignment(page);
  await page.getByRole("tab", { name: "Cliente", exact: true }).click();
  await openOrigin(page);
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Recarregar cliente", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.segmentTest.assignments.length)).toBe(1);
  expect(await page.evaluate(() => window.segmentTest.detailReads.length)).toBe(1);
  await page.evaluate(() => {
    window.segmentTest.assignmentError = null;
    window.segmentTest.details[40].customer.SEGMENTO = 3;
    window.segmentTest.details[40].segment = { code: 3, name: "Varejo" };
  });
  await page.getByRole("button", { name: "Recarregar cliente", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Varejo (3)",
  );
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.segmentTest.detailReads.length)).toBe(2);
});

test("real customer modal ignores a delayed response for a previous customer", async ({ page }) => {
  await page.goto("/tests/customer-segments/index.html?modal&late-40");
  await expect
    .poll(() => page.evaluate(() => window.segmentTest.detailReads.map((read) => read.id)))
    .toContain(40);
  await page.getByRole("button", { name: "Abrir cliente 41", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Razão Social", exact: true })).toHaveValue(
    "Cliente 41",
  );
  await expect
    .poll(() => page.evaluate(() => window.segmentTest.detailReadsCompleted.map((read) => read.id)))
    .toContain(40);
  await expect(page.getByRole("textbox", { name: "Razão Social", exact: true })).toHaveValue(
    "Cliente 41",
  );
  await openOrigin(page);
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Varejo (3)",
  );
  await chooseSegment(page, "Atacado (1)");
  await page.getByRole("button", { name: "Salvar segmento", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.segmentTest.assignments))
    .toEqual([{ id: 41, data: { SEGMENTO: 1, expected: { SEGMENTO: 3 } } }]);
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Atacado (1)",
  );
});

test("real customer modal reloads only the segment without erasing other drafts", async ({
  page,
}) => {
  await page.goto("/tests/customer-segments/index.html?modal");
  await page.getByRole("textbox", { name: "Razão Social", exact: true }).fill("Razão em rascunho");
  await openOrigin(page);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("rascunho@example.test");
  await unknownAssignment(page);
  await page.evaluate(() => {
    window.segmentTest.details[40].customer.RAZAO = "Razão nova no servidor";
    window.segmentTest.details[40].customer.EMAIL = "servidor@example.test";
    window.segmentTest.details[40].customer.SEGMENTO = 3;
    window.segmentTest.details[40].segment = { code: 3, name: "Varejo" };
  });
  await page.getByRole("button", { name: "Recarregar cliente", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Varejo (3)",
  );
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue(
    "rascunho@example.test",
  );
  await page.getByRole("tab", { name: "Cliente", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Razão Social", exact: true })).toHaveValue(
    "Razão em rascunho",
  );
});

test("real customer modal requires a completed authoritative read after token refresh", async ({
  page,
}) => {
  await page.goto("/tests/customer-segments/index.html?modal");
  await openOrigin(page);
  await unknownAssignment(page);
  await page.evaluate(() => {
    window.segmentTest.detailDelays[40] = 1000;
  });
  await page.getByRole("button", { name: "Atualizar token", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.segmentTest.detailReads.at(-1)?.token))
    .toBe("local-test-refreshed-1");
  await expect(page.getByRole("button", { name: "Salvar segmento", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.assignments.length)).toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.segmentTest.detailReadsCompleted.at(-1)?.token))
    .toBe("local-test-refreshed-1");
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toHaveValue(
    "Atacado (1)",
  );
  await expect(page.getByRole("combobox", { name: "Segmento", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.segmentTest.assignments.length)).toBe(1);
});
