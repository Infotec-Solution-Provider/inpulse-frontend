import { test, expect, type Page } from "@playwright/test";
const options = {
  enabled: true,
  saleEnabled: true,
  observationRequired: true,
  priorityAllowed: true,
  operators: [{ id: 8, name: "Ana" }],
  results: [
    {
      id: 1,
      name: "Rediscar",
      COD_ACAO: 1,
      PROPOSTA: "NAO",
      CANCELAPROPOSTA: "NAO",
      EVENDA: "NAO",
    },
    { id: 2, name: "Delegar", COD_ACAO: 8, PROPOSTA: "NAO", CANCELAPROPOSTA: "NAO", EVENDA: "NAO" },
    { id: 3, name: "Venda", COD_ACAO: 20, PROPOSTA: "SIM", CANCELAPROPOSTA: "NAO", EVENDA: "SIM" },
  ],
};
async function setup(
  page: Page,
  failDiscovery = false,
  unknown = false,
  override: Record<string, unknown> = {},
) {
  const commands: any[] = [];
  page.on("pageerror", (error) => {
    throw error;
  });
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Maximum update"))
      throw Error(message.text());
  });
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/finish-options"))
      return route.fulfill({
        status: failDiscovery ? 503 : 200,
        json: failDiscovery ? { message: "Unavailable" } : { data: { ...options, ...override } },
      });
    if (url.includes("/for-schedule/")) return route.fulfill({ json: { data: [] } });
    if (route.request().method() === "PATCH") {
      commands.push(route.request().postDataJSON());
      return route.fulfill({
        status: unknown ? 503 : 200,
        json: unknown
          ? { code: "TELEPHONY_FINISH_UNKNOWN", outcome: "UNKNOWN" }
          : { data: { historyId: 1, successorScheduleId: 42 } },
      });
    }
    if (url.includes("/finish-v2/"))
      return route.fulfill({ json: { data: { status: "applied" } } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto("/tests/telephony-finish/index.html");
  return commands;
}
async function result(page: Page, name: string) {
  await page.getByLabel("Resultado").click();
  await page.getByRole("option", { name, exact: true }).click();
}
test("delegates with selected operator/date/observation and commits once", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-13T16:00:00.000Z"));
  const commands = await setup(page);
  await result(page, "Delegar");
  await page.getByLabel("Observação do atendimento").fill("Cliente pediu retorno.");
  await page.getByLabel("Delegar para").click();
  await page.getByRole("option", { name: "Ana" }).click();
  const agenda = page.getByRole("region", { name: "Agenda do operador" });
  await agenda.getByRole("button", { name: "14 0 ag.", exact: true }).click();
  await agenda.getByRole("button", { name: "11:30 livre", exact: true }).click();
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect.poll(() => commands.length).toBe(1);
  expect(commands[0]).toMatchObject({
    resultId: 2,
    delegateOperatorId: 8,
    scheduleDate: "2026-11-14T11:30",
    observation: "Cliente pediu retorno.",
  });
  await expect
    .poll(() => page.evaluate(() => window.finishHarness))
    .toMatchObject({ before: 1, committed: 1, legacy: 0 });
});
test("failed discovery cannot fall back to legacy finalization", async ({ page }) => {
  const commands = await setup(page, true);
  await expect(
    page.getByText("Não foi possível conferir o fluxo de finalização. Reabra o atendimento."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  expect(commands).toHaveLength(0);
  expect(await page.evaluate(() => window.finishHarness.legacy)).toBe(0);
});
test("ambiguous response blocks repeat and confirms original receipt", async ({ page }) => {
  const commands = await setup(page, false, true);
  await result(page, "Rediscar");
  await page.getByLabel("Observação do atendimento").fill("Retorno solicitado.");
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Conferir finalização" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Conferir finalização" }).click();
  await expect.poll(() => page.evaluate(() => window.finishHarness.committed)).toBe(1);
  expect(commands).toHaveLength(1);
});
test("sale and proposal fields are required only by enabled tenant result", async ({ page }) => {
  const commands = await setup(page);
  await result(page, "Venda");
  await page.getByLabel("Observação do atendimento").fill("Venda confirmada.");
  await page.getByLabel("Valor da proposta (R$)").fill("150,25");
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  await page.getByLabel("Descrição da venda").fill("Pedido fixture");
  await page.getByLabel("Valor da venda (R$)").fill("150,25");
  await page.getByLabel("Forma de pagamento").fill("PIX");
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect.poll(() => commands.length).toBe(1);
  expect(commands[0]).toMatchObject({
    proposalValue: "150.25",
    sale: { description: "Pedido fixture", value: "150.25", paymentMethod: "PIX", proposalIds: [] },
  });
});
test("contact phase can require observation and remains usable on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const commands = await setup(page, false, false, {
    observationRequired: false,
    phaseRequired: true,
    phases: [{ id: 1, name: "Negociacao", observationRequired: "S" }],
  });
  await result(page, "Rediscar");
  await page.getByLabel("Fase do contato").click();
  await page.getByRole("option", { name: "Negociacao" }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  await page.getByLabel("Observação do atendimento").fill("Retorno solicitado.");
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Finalizar", exact: true }).focus();
  await page.screenshot({ path: "test-results/telephony-finish-v2-mobile.png", fullPage: true,animations:"disabled" });
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect.poll(() => commands.length).toBe(1);
  expect(commands[0].phaseContactId).toBe(1);
});
