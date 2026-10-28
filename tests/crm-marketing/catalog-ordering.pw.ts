import { expect, test } from "@playwright/test";
test.use({ hasTouch: true });
const url = "/tests/crm-marketing/index.html?panel=ordering&list=segments";
const list = (page: import("@playwright/test").Page) =>
  page.getByRole("list", { name: "Sequência completa de prioridades" });
test("virtual list searches without filtering, keyboard moves and saves the complete sequence", async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.getByText("1200 itens", { exact: false })).toBeVisible();
  expect(await list(page).getByRole("listitem").count()).toBeLessThan(20);
  await page.getByRole("button", { name: "Mover Segmento 0001.", exact: false }).focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
  await page.getByRole("textbox", { name: "Localizar na sequência" }).fill("1200");
  await page.getByRole("button", { name: "Localizar próximo" }).click();
  await expect(list(page).getByText("Segmento 1200", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("1200 itens", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Início Segmento 1200", exact: true }).click();
  await page.getByRole("button", { name: "Salvar prioridades", exact: true }).click();
  await expect(page.getByText("Prioridades salvas.", { exact: false })).toBeVisible();
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls.at(-1).payload.ids).toHaveLength(1200);
  expect(calls.at(-1).payload.ids.slice(0, 3)).toEqual([1200, 2, 1]);
  await page.screenshot({
    path: "test-results-crm-marketing/catalog-ordering-desktop.png",
    fullPage: true,
  });
});
test("independent tabs and token renewal preserve unsaved moves; undo restores the list", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Descer Segmento 0001", exact: true }).click();
  await page.getByRole("tab", { name: "Campanhas", exact: true }).click();
  await expect(page.getByText("Pausada", { exact: false }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Segmentos", exact: true }).click();
  await page.getByRole("button", { name: "Renovar sessão" }).click();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
  await page.getByRole("button", { name: "Desfazer movimentos", exact: true }).click();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0001");
  expect(await page.evaluate(() => (window as any).crmHarness.calls())).toHaveLength(0);
});
test("conflict keeps draft and requires explicit reload", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Descer Segmento 0001", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.fault("conflict"));
  await page.getByRole("button", { name: "Salvar prioridades", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Salvar prioridades", exact: true }),
  ).toBeDisabled();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Conferir lista", exact: true }).click();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0001");
});
test("ambiguous applied save never retries and remains blocked across tabs until confirmation", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Descer Segmento 0001", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.fault("unknown"));
  await page.getByRole("button", { name: "Salvar prioridades", exact: true }).click();
  await page.getByRole("tab", { name: "Estados", exact: true }).click();
  await page.getByRole("tab", { name: "Segmentos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Salvar prioridades", exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => (window as any).crmHarness.calls())).toHaveLength(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Conferir lista", exact: true }).click();
  await expect(page.getByText("Lista conferida.", { exact: false })).toBeVisible();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
});
test("pointer drag reorders visible rows", async ({ page }) => {
  await page.goto(url);
  const handle = page.getByRole("button", { name: "Mover Segmento 0001.", exact: false });
  const target = page.getByRole("button", { name: "Mover Segmento 0003.", exact: false });
  const a = await handle.boundingBox(),
    b = await target.boundingBox();
  await page.mouse.move(a!.x + 18, a!.y + 20);
  await page.mouse.down();
  await page.mouse.move(a!.x + 18, a!.y + 35, { steps: 3 });
  await page.mouse.move(b!.x + 18, b!.y + 20, { steps: 12 });
  await page.mouse.up();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
});
test("touch drag and landscape keep ordering reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  const handle = page.getByRole("button", { name: "Mover Segmento 0001.", exact: false });
  await handle.scrollIntoViewIfNeeded();
  const a = await handle.boundingBox(),
    b = await page
      .getByRole("button", { name: "Mover Segmento 0003.", exact: false })
      .boundingBox();
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: a!.x + 18, y: a!.y + 20 }],
  });
  await page.waitForTimeout(220); // The configured touch hold activation is 180 ms.
  for (let i = 1; i <= 10; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: a!.x + 18, y: a!.y + 20 + ((b!.y - a!.y) * i) / 10 }],
    });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Salvar prioridades", exact: true }).click();
  await expect(page.getByText("Prioridades salvas.", { exact: false })).toBeVisible();
});
test("token changes during save never replay the old write or discard its draft", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Descer Segmento 0001", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.fault("delay"));
  await page.getByRole("button", { name: "Salvar prioridades", exact: true }).click();
  await page.getByRole("button", { name: "Renovar sessão" }).click();
  await page.evaluate(() => (window as any).crmHarness.release());
  await expect(page.getByRole("button", { name: "Conferir lista", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar prioridades", exact: true }),
  ).toBeDisabled();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls).toHaveLength(1);
  expect(calls[0].token).toBe("token-a");
});
test("mobile controls, city scopes and mode save remain usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.getByRole("button", { name: "Descer Segmento 0001", exact: true }).tap();
  await expect(list(page).getByRole("listitem").first()).toContainText("Segmento 0002");
  await page.getByRole("tab", { name: "Cidades", exact: true }).click();
  await page.getByLabel("Lista de cidades").click();
  await page.getByRole("option", { name: "SP — São Paulo" }).click();
  await expect(page.getByText("600 itens", { exact: false })).toBeVisible();
  await page.getByRole("tab", { name: "Critérios", exact: true }).click();
  await page.getByLabel("Modo de cidades").click();
  await page.getByRole("option", { name: "Ordem nacional", exact: false }).click();
  await page.getByRole("button", { name: "Salvar ordem", exact: true }).click();
  await expect(page.getByText("Ordem dos critérios salva.")).toBeVisible();
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls.at(-1).payload.cityMode).toBe("S");
  expect(calls.filter((c: any) => c.name === "saveCatalogOrdering")).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: "test-results-crm-marketing/catalog-ordering-mobile.png",
    fullPage: true,
  });
});
