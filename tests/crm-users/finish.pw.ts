import { expect, test } from "@playwright/test";

test("telephone: uncertain finalization is checked by receipt without another write", async ({
  page,
}) => {
  await page.goto("/tests/crm-users/index.html?finish=telephone");
  await page.getByRole("combobox", { name: /^Resultado/ }).click();
  await page.getByRole("option", { name: "Finalizado", exact: true }).click();
  await page.evaluate(() => {
    window.userTest.finishFailure = 503;
  });
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível confirmar");
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Conferir finalização", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ainda não foi confirmada");
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  await page.evaluate(() => {
    window.userTest.finishStatus = "applied";
  });
  await page.getByRole("button", { name: "Conferir finalização", exact: true }).click();
  const state = await page.evaluate(() => window.userTest);
  expect(state.finishRequests).toHaveLength(1);
  expect(state.finishRequests[0].operationId).toMatch(/^[0-9a-f-]{36}$/);
  expect(Number.isNaN(Date.parse(state.finishRequests[0].finishedAt))).toBe(false);
  expect(state.finishChecks).toEqual([
    state.finishRequests[0].operationId,
    state.finishRequests[0].operationId,
  ]);
  expect(state.closed).toBe(1);
});

test("telephone: validation rejection preserves operation identity and finish instant", async ({
  page,
}) => {
  await page.goto("/tests/crm-users/index.html?finish=telephone");
  await page.getByRole("combobox", { name: /^Resultado/ }).click();
  await page.getByRole("option", { name: "Finalizado", exact: true }).click();
  await page.evaluate(() => {
    window.userTest.finishFailure = 400;
  });
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Confira o resultado");
  await page.evaluate(() => {
    window.userTest.finishFailure = 0;
  });
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  const requests = await page.evaluate(() => window.userTest.finishRequests);
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
});

test("telephone: tenant change closes the original action without writing", async ({ page }) => {
  await page.goto("/tests/crm-users/index.html?finish=telephone");
  await page.getByRole("combobox", { name: /^Resultado/ }).click();
  await page.getByRole("option", { name: "Finalizado", exact: true }).click();
  await page.getByRole("button", { name: "Trocar tenant", exact: true }).click();
  await expect(page.getByText("Finalizar atendimento", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.userTest.finishRequests)).toEqual([]);
});

for (const mode of ["telephone", "chat"]) {
  const url = `/tests/crm-users/index.html?finish=${mode}`;
  test(`${mode}: changing to a finish result does not send an old scheduling date`, async ({
    page,
  }) => {
    await page.goto(url);
    await page.getByRole("combobox", { name: /^Resultado/ }).click();
    await page.getByRole("option", { name: "Reagendar", exact: true }).click();
    await page.getByLabel(/Data e hora/).fill("2026-11-20T14:30");
    await page.getByRole("combobox", { name: /^Resultado/ }).click();
    await page.getByRole("option", { name: "Finalizado", exact: true }).click();
    await expect(page.getByLabel(/Data e hora/)).toHaveCount(0);
    await page.getByRole("button", { name: "Finalizar", exact: true }).click();
    expect(await page.evaluate(() => window.userTest.finishes)).toEqual([
      { resultId: 1, scheduleDate: null },
    ]);
  });
  test(`${mode}: each rescheduling result requires a new explicit date`, async ({ page }) => {
    await page.goto(url);
    await page.getByRole("combobox", { name: /^Resultado/ }).click();
    await page.getByRole("option", { name: "Reagendar", exact: true }).click();
    await page.getByLabel(/Data e hora/).fill("2026-11-20T14:30");
    await page.getByRole("combobox", { name: /^Resultado/ }).click();
    await page.getByRole("option", { name: "Outro reagendamento", exact: true }).click();
    await expect(page.getByLabel(/Data e hora/)).toHaveValue("");
    await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
    await page.getByLabel(/Data e hora/).fill("2026-11-21T15:30");
    await page.getByRole("button", { name: "Finalizar", exact: true }).click();
    const finishes = await page.evaluate(() => window.userTest.finishes);
    expect(finishes).toHaveLength(1);
    expect(finishes[0].resultId).toBe(3);
    expect(finishes[0].scheduleDate).toBeTruthy();
  });
}
