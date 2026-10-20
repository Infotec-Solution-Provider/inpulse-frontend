import { test, expect, type Page } from "@playwright/test";

async function open(page: Page, route: string) {
  await page.goto("/tests/admin-cruds/index.html");
  await page
    .getByRole("heading", { name: "Mensagens prontas", exact: true })
    .waitFor({ timeout: 30000 });
  await page.evaluate((route) => (window as any).adminCrudTest.navigate(route), route);
}

test("SIP sections retain drafts, isolate saves and keep failed writes", async ({ page }) => {
  await open(page, "sip-config");
  await page.getByLabel("Domínio SIP", { exact: true }).fill("rascunho.invalid");
  await page.getByRole("tab", { name: "Central e chamadas" }).click();
  await page.getByLabel("Servidor Asterisk", { exact: true }).fill("central.invalid");
  await page.getByRole("tab", { name: "Avançado", exact: true }).click();
  await page.getByLabel("Dispositivo de entrada", { exact: true }).fill("entrada-demo");
  await page.getByRole("button", { name: "Salvar central", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salvar central", exact: true })).toBeDisabled();
  const calls = await page.evaluate(() => (window as any).adminCrudTest.calls());
  expect(calls.find((c: any) => c.kind === "save-sip").data).toMatchObject({
    ASTERISK_SERVER: "central.invalid",
    CALL_IN_DEVICE: "entrada-demo",
  });
  expect(calls.filter((c: any) => c.kind === "save-webrtc")).toHaveLength(0);
  await page.getByRole("tab", { name: "Telefonia web", exact: true }).click();
  await expect(page.getByLabel("Domínio SIP", { exact: true })).toHaveValue("rascunho.invalid");
  await page.evaluate(() => (window as any).adminCrudTest.fail());
  await page.getByRole("button", { name: "Salvar telefonia web", exact: true }).click();
  await expect(page.getByText(/Não foi possível confirmar a gravação/)).toBeVisible();
  await expect(page.getByLabel("Domínio SIP", { exact: true })).toHaveValue("rascunho.invalid");
  await expect(
    page.getByRole("button", { name: "Salvar telefonia web", exact: true }),
  ).toBeDisabled();
});

test("AI section drafts, validation routing and failed save preserve edits", async ({ page }) => {
  await open(page, "ai-settings");
  await page.getByRole("tab", { name: "Limites de gasto", exact: true }).click();
  await page.getByLabel("Limite da empresa", { exact: true }).fill("12.5");
  await page.getByRole("tab", { name: "Modelos", exact: true }).click();
  await page.getByRole("tab", { name: "Limites de gasto", exact: true }).click();
  await expect(page.getByLabel("Limite da empresa", { exact: true })).toHaveValue("12.5");
  await page.evaluate(() => (window as any).adminCrudTest.fail());
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Limite da empresa", { exact: true })).toHaveValue("12.5");
  await page.getByLabel("Limite da empresa", { exact: true }).fill("-1");
  await page.getByRole("tab", { name: "Conexão", exact: true }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Limites de gasto", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Limite da empresa", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

for (const [width, height] of [
  [1440, 900],
  [390, 844],
  [320, 844],
  [844, 390],
]) {
  test(`settings panels and assistant controls reflow ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await open(page, "ai-settings");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => (window as any).adminCrudTest.theme(theme), theme);
      for (const name of ["Conexão", "Modelos", "Limites de gasto", "Consumo"]) {
        await page.getByRole("tab", { name, exact: true }).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    }
    await page.evaluate(() => (window as any).adminCrudTest.navigate("ai-supervisor"));
    await page.getByRole("heading", { name: "Assistente", exact: true }).waitFor();
    const input = page.getByRole("textbox", { name: "Mensagem ao assistente" });
    await input.fill("Pergunta demonstrativa");
    if (width < 1024) {
      await page.getByRole("button", { name: "Conversas", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Voltar à conversa", exact: true }).click();
      await expect(input).toHaveValue("Pergunta demonstrativa");
    }
    await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
    await expect(page.getByText("Resposta demonstrativa", { exact: true })).toBeVisible();
    await expect(input).toHaveValue("");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
