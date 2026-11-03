import { test, expect } from "@playwright/test";
for (const width of [1280, 390]) {
  test(`catalog preserves used questions and completes CRUD at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/satisfaction/index.html");
    await expect(
      page.getByRole("button", { name: "Editar pergunta 1", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Nova pergunta", exact: true }).click();
    await page.getByLabel("Descrição da pergunta").fill("Nova pergunta de teste");
    await page.getByRole("button", { name: "Salvar pergunta" }).click();
    await expect(page.getByText("3 — Nova pergunta de teste")).toBeVisible();
    await page.getByRole("button", { name: "Editar pergunta 3", exact: true }).click();
    await page.getByLabel("Descrição da pergunta").fill("Descrição revista");
    await page.getByRole("button", { name: "Salvar pergunta" }).click();
    await expect(page.getByText("3 — Descrição revista")).toBeVisible();
    await page.getByRole("button", { name: "Excluir pergunta 3", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByText("3 — Descrição revista")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/satisfaction/catalog-${width}.png`,
      fullPage: true,
    });
  });
  test(`requires every answer including explicit none before atomic finish at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/satisfaction/index.html?mode=call");
    await page.getByRole("combobox", { name: /^Resultado/ }).click();
    await page.getByRole("option", { name: "Com pesquisa", exact: true }).click();
    await expect(page.getByRole("group", { name: "Pesquisa da ligação" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
    await page.getByRole("combobox", { name: /^Avaliação 1/ }).click();
    await page.getByRole("option", { name: "5 — Muito bom", exact: true }).click();
    await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
    await page.getByRole("combobox", { name: /^Avaliação 2/ }).click();
    await page.getByRole("option", { name: "Nenhum", exact: true }).click();
    await expect(page.locator("[role=listbox]")).toHaveCount(0);
    await page.screenshot({ path: `test-results/satisfaction/call-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Finalizar", exact: true }).click();
    const calls = await page.evaluate(() =>
      (window as any).fixture.calls.filter((c: any) => c.finish),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].finish[4].answers).toEqual([
      { questionId: 1, rating: 5 },
      { questionId: 2, rating: null },
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
test("unknown writes block repeated catalog saves until explicit reload", async ({ page }) => {
  await page.goto("/tests/satisfaction/index.html");
  await page.evaluate(() => ((window as any).fixture.failWrite = true));
  await page.getByRole("button", { name: "Nova pergunta", exact: true }).click();
  await page.getByLabel("Descrição da pergunta").fill("Nova");
  await page.getByRole("button", { name: "Salvar pergunta" }).click();
  await expect(page.getByRole("button", { name: "Salvar pergunta" })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).fixture.calls.length)).toBe(1);
});
test("changing result clears responses; survey load failure blocks finalization", async ({
  page,
}) => {
  await page.goto("/tests/satisfaction/index.html?mode=call");
  await page.getByRole("combobox", { name: /^Resultado/ }).click();
  await page.getByRole("option", { name: "Com pesquisa", exact: true }).click();
  await page.getByRole("combobox", { name: /^Avaliação 1/ }).click();
  await page.getByRole("option", { name: "5 — Muito bom", exact: true }).click();
  await page.getByRole("combobox", { name: /^Resultado/ }).click();
  await page.getByRole("option", { name: "Sem pesquisa", exact: true }).click();
  await expect(page.getByRole("group", { name: "Pesquisa da ligação" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeEnabled();
  await page.evaluate(() => ((window as any).fixture.failSurvey = true));
  await page.getByRole("combobox", { name: /^Resultado/ }).click();
  await page.getByRole("option", { name: "Com pesquisa", exact: true }).click();
  await expect(
    page.getByText("Não foi possível carregar a pesquisa deste resultado.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
});
