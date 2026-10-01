import { expect, test } from "@playwright/test";
import type {} from "./doubles";

test("microphone lifecycle, SIP state controls, navigation and logout", async ({ page }) => {
  await page.goto("/tests/telephony/index.html");
  await page.getByRole("button", { name: "Abrir telefone" }).click();
  await page.getByRole("button", { name: "Conectar telefonia" }).click();
  await expect(page.getByText("Ramal conectado")).toBeVisible();
  await page.getByLabel("Telefone ou ramal").fill("102");
  await page.getByRole("button", { name: "Ligar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desligar" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.phoneHarness.media?.getAudioTracks()[0].readyState)).toBe("live");
  await page.evaluate(() => window.phoneHarness.session?.emit("confirmed"));
  await page.getByRole("button", { name: "Mudo", exact: true }).click();
  expect(await page.evaluate(() => window.phoneHarness.media?.getAudioTracks()[0].enabled)).toBe(false);
  await page.getByRole("button", { name: "Navegar" }).click();
  await expect(page.getByText("Atendimento — página 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Desligar" })).toBeVisible();
  await page.screenshot({ path: "test-results/telephony-active.png", fullPage: true });
  await page.getByRole("button", { name: "Desligar" }).click();
  expect(await page.evaluate(() => window.phoneHarness.media?.getAudioTracks()[0].readyState)).toBe("ended");
  await page.getByRole("button", { name: "Ligar agendamento" }).click();
  await expect.poll(() => page.evaluate(() => window.phoneHarness.calls.length)).toBe(2);
  await page.evaluate(() => window.phoneHarness.session?.emit("confirmed"));
  await expect.poll(() => page.evaluate(() => window.phoneHarness.reports)).toEqual(["answered"]);
  await page.evaluate(() => window.phoneHarness.logout());
  await expect(page.getByLabel("Telefone web")).toHaveCount(0);
  expect(await page.evaluate(() => window.phoneHarness.media?.getAudioTracks()[0].readyState)).toBe("ended");
  await expect.poll(() => page.evaluate(() => window.phoneHarness.reports)).toEqual(["answered", "ended"]);
});

test("second tab cannot register the same operator until the first disconnects", async ({ page, context }) => {
  await page.goto("/tests/telephony/index.html");
  await page.getByRole("button", { name: "Abrir telefone" }).click();
  await page.getByRole("button", { name: "Conectar telefonia" }).click();
  await expect(page.getByText("Ramal conectado")).toBeVisible();
  const second = await context.newPage(); await second.goto("/tests/telephony/index.html");
  await second.getByRole("button", { name: "Abrir telefone" }).click();
  await second.getByRole("button", { name: "Conectar telefonia" }).click();
  await expect(second.getByText(/outra aba/)).toBeVisible();
  await page.getByRole("button", { name: "Desconectar", exact: true }).click();
  await second.getByRole("button", { name: "Conectar telefonia" }).click();
  await expect(second.getByText("Ramal conectado")).toBeVisible();
});

test("phone stays in the attendance area and appears elsewhere only during a call", async ({ page }) => {
  await page.goto("/tests/telephony/index.html");
  await expect(page.getByLabel("Telefone web")).toBeVisible();
  await page.getByRole("button", { name: "Ir para outra tela" }).click();
  await expect(page.getByText("Outra tela")).toBeVisible();
  await expect(page.getByLabel("Telefone web")).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar ao atendimento" }).click();
  await page.getByRole("button", { name: "Abrir telefone" }).click();
  await page.getByRole("button", { name: "Conectar telefonia" }).click();
  await expect(page.getByText("Ramal conectado")).toBeVisible();
  await page.getByLabel("Telefone ou ramal").fill("102");
  await page.getByRole("button", { name: "Ligar", exact: true }).click();
  await page.evaluate(() => window.phoneHarness.session?.emit("confirmed"));
  await page.getByRole("button", { name: "Ir para outra tela" }).click();
  await expect(page.getByLabel("Telefone web")).toHaveCount(1);
  await page.getByRole("button", { name: "Desligar" }).click();
  await expect(page.getByLabel("Telefone web")).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar ao atendimento" }).click();
  await expect(page.getByLabel("Telefone web")).toHaveCount(1);
  await expect(page.getByText("Ramal conectado")).toBeVisible();
});
