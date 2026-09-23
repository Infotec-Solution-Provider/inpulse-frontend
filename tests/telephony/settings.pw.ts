import { expect, test } from "@playwright/test";
import type {} from "./doubles";

test("admin edits WebRTC and TURN settings and reloads saved values", async ({ page }) => {
  await page.goto("/tests/telephony/settings.html");
  await expect(page.getByLabel("Habilitar telefonia web")).not.toBeChecked();
  await page.getByLabel("Habilitar telefonia web").check();
  await page.getByLabel("Endereço WSS", { exact: true }).fill("wss://pbx.example.test/ws");
  await page.getByLabel("Domínio SIP", { exact: true }).fill("pbx.example.test");
  await page.getByRole("button", { name: "Adicionar servidor STUN/TURN" }).click();
  await page.getByLabel("Endereços STUN/TURN 1").fill("turn:relay.example.test:3478\n turns:relay.example.test:5349 ");
  await page.getByLabel("Usuário TURN 1").fill("test-user");
  await page.getByLabel("Senha TURN 1").fill("test-only");
  await expect(page.getByLabel("Senha TURN 1")).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Salvar telefonia web" }).click();
  await expect(page.getByRole("alert")).toContainText("Telefonia web salva");
  expect(await page.evaluate(() => window.phoneHarness.settings)).toEqual({
    enabled: true, websocketUrl: "wss://pbx.example.test/ws", domain: "pbx.example.test",
    iceServers: [{ urls: ["turn:relay.example.test:3478", "turns:relay.example.test:5349"], username: "test-user", credential: "test-only" }],
  });
  await page.getByLabel("Domínio SIP", { exact: true }).fill("unsaved.test");
  await page.getByRole("button", { name: "Atualizar telefonia web" }).click();
  await expect(page.getByLabel("Domínio SIP", { exact: true })).toHaveValue("pbx.example.test");
  await page.screenshot({ path: "test-results/telephony-settings.png", fullPage: true });
  await page.getByLabel("Habilitar telefonia web").uncheck();
  await page.getByRole("button", { name: "Remover servidor 1" }).click();
  await page.getByRole("button", { name: "Salvar telefonia web" }).click();
  await expect.poll(() => page.evaluate(() => window.phoneHarness.settings.enabled)).toBe(false);
  expect(await page.evaluate(() => window.phoneHarness.settings.iceServers)).toEqual([]);
});

test("read failures block writes and ambiguous saves require reload", async ({ page }) => {
  await page.goto("/tests/telephony/settings.html?settings-load-error");
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar");
  await expect(page.getByRole("button", { name: "Salvar telefonia web" })).toBeDisabled();
  expect(await page.evaluate(() => window.phoneHarness.settingsSaveCount)).toBe(0);
  await page.evaluate(() => { window.phoneHarness.settingsLoadError = false; });
  await page.getByRole("button", { name: "Atualizar telefonia web" }).click();
  await expect(page.getByRole("button", { name: "Salvar telefonia web" })).toBeEnabled();
  await page.evaluate(() => { window.phoneHarness.settingsSaveError = true; });
  await page.getByRole("button", { name: "Salvar telefonia web" }).click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível confirmar");
  await expect(page.getByRole("button", { name: "Salvar telefonia web" })).toBeDisabled();
  expect(await page.evaluate(() => window.phoneHarness.settingsSaveCount)).toBe(1);
  await page.getByRole("button", { name: "Atualizar telefonia web" }).click();
  await expect(page.getByRole("button", { name: "Salvar telefonia web" })).toBeEnabled();
});
