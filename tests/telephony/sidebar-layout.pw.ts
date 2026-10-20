import { expect, test, type Locator, type Page } from "@playwright/test";
import type {} from "./harness";
import type {} from "./doubles";

const visiblePhone = (page: Page) => page.locator('section[aria-label="Telefone web"]:visible');
const bounds = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
};
async function connect(page: Page) {
  await visiblePhone(page).getByRole("button", { name: "Abrir telefone" }).click();
  await visiblePhone(page).getByRole("button", { name: "Conectar telefonia" }).click();
  await expect(visiblePhone(page).getByText("Ramal conectado")).toBeVisible();
}

test("phone, next call, conversation filters and list occupy the left column in order", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tests/telephony/index.html");
  const phone = visiblePhone(page);
  const next = page.getByLabel("Próxima ligação", { exact: true });
  const filters = page.getByLabel("Filtros de conversas", { exact: true });
  const list = page.getByLabel("Lista de conversas", { exact: true });
  const [phoneBox, nextBox, filtersBox, listBox, columnBox, chatBox] = await Promise.all([
    bounds(phone), bounds(next), bounds(filters), bounds(list), bounds(page.getByTestId("sidebar-container")), bounds(page.getByLabel("Área da conversa", { exact: true })),
  ]);
  expect(phoneBox.y + phoneBox.height).toBeLessThanOrEqual(nextBox.y + 1);
  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(filtersBox.y + 1);
  expect(filtersBox.y + filtersBox.height).toBeLessThanOrEqual(listBox.y + 1);
  expect(phoneBox.x).toBeGreaterThanOrEqual(columnBox.x);
  expect(phoneBox.x + phoneBox.width).toBeLessThanOrEqual(columnBox.x + columnBox.width);
  expect(phoneBox.x + phoneBox.width).toBeLessThanOrEqual(chatBox.x);
  expect(await phone.evaluate(element => getComputedStyle(element).position)).not.toMatch(/fixed|absolute/);
  await expect(page.getByRole("heading", { name: "Conversas", exact: true })).toBeVisible();
  await page.getByLabel("Pesquisar conversa", { exact: true }).fill("teste");
  await expect(page.getByLabel("Pesquisar conversa", { exact: true })).toHaveValue("teste");
  await page.screenshot({ path: "test-results/telephony-sidebar-desktop.png", fullPage: true });
});

test("an expanded active phone leaves the list scrollable and the chat composer clickable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 540 });
  await page.goto("/tests/telephony/index.html");
  await connect(page);
  await visiblePhone(page).getByLabel("Telefone ou ramal").fill("102");
  await visiblePhone(page).getByRole("button", { name: "Ligar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.phoneHarness.session !== null)).toBe(true);
  await page.evaluate(() => window.phoneHarness.session?.emit("confirmed"));
  await expect(visiblePhone(page).getByRole("button", { name: "Mudo", exact: true })).toBeVisible();
  const list = page.getByLabel("Lista de conversas", { exact: true });
  const listBox = await bounds(list);
  expect(listBox.height).toBeGreaterThan(40);
  await expect(page.getByRole("heading", { name: "Conversas", exact: true })).toBeVisible();
  await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(list.getByRole("button", { name: "Conversa 40", exact: true })).toBeVisible();
  await page.getByLabel("Mensagem", { exact: true }).fill("Compositor livre");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada: Compositor livre")).toBeVisible();
  const phoneBox = await bounds(visiblePhone(page));
  const composerBox = await bounds(page.getByLabel("Compositor de mensagens"));
  expect(phoneBox.x + phoneBox.width).toBeLessThanOrEqual(composerBox.x);
  await page.screenshot({ path: "test-results/telephony-sidebar-short-active.png", fullPage: true });
  await visiblePhone(page).getByRole("button", { name: "Desligar" }).click();
});

test("incoming calls expand the sidebar and preserve answer, mute, DTMF, end and reject controls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tests/telephony/index.html");
  await connect(page);
  await visiblePhone(page).getByRole("button", { name: "Recolher telefone" }).click();
  await expect(visiblePhone(page).getByLabel("Telefone ou ramal")).toHaveCount(0);
  await page.getByRole("button", { name: "Ocultar telefonia e próxima ligação", exact: true }).click();
  await expect(visiblePhone(page)).toHaveCount(0);
  await page.evaluate(() => window.phoneLayoutHarness.incoming());
  await expect(page.getByRole("button", { name: "Ocultar telefonia e próxima ligação", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(visiblePhone(page).getByRole("button", { name: "Atender", exact: true })).toBeVisible();
  await expect(visiblePhone(page).getByRole("button", { name: "Recusar", exact: true })).toBeVisible();
  await visiblePhone(page).getByRole("button", { name: "Atender", exact: true }).click();
  await expect(visiblePhone(page).getByRole("button", { name: "Mudo", exact: true })).toBeVisible();
  await visiblePhone(page).getByRole("button", { name: "Mudo", exact: true }).click();
  expect(await page.evaluate(() => window.phoneHarness.media?.getAudioTracks()[0].enabled)).toBe(false);
  await visiblePhone(page).getByRole("button", { name: "#", exact: true }).click();
  expect(await page.evaluate(() => window.phoneLayoutHarness.tones)).toEqual(["#"]);
  await visiblePhone(page).getByRole("button", { name: "Ativar microfone", exact: true }).click();
  expect(await page.evaluate(() => window.phoneHarness.media?.getAudioTracks()[0].enabled)).toBe(true);
  await visiblePhone(page).getByRole("button", { name: "Desligar", exact: true }).click();
  expect(await page.evaluate(() => window.phoneHarness.media?.getAudioTracks()[0].readyState)).toBe("ended");
  await visiblePhone(page).getByRole("button", { name: "Recolher telefone" }).click();
  await page.evaluate(() => window.phoneLayoutHarness.incoming());
  await visiblePhone(page).getByRole("button", { name: "Recusar", exact: true }).click();
  await expect(visiblePhone(page).getByRole("button", { name: "Recusar", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.phoneHarness.calls)).toEqual([]);
});

test("mobile chat keeps a single visible inline phone and an accessible message composer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("/tests/telephony/index.html");
  await connect(page);
  await page.getByRole("button", { name: "Conversa 1", exact: true }).click();
  await expect(page.getByTestId("sidebar-container")).toBeHidden();
  await expect(visiblePhone(page)).toHaveCount(1);
  expect(await visiblePhone(page).evaluate(element => getComputedStyle(element).position)).not.toMatch(/fixed|absolute/);
  await page.evaluate(() => window.phoneLayoutHarness.incoming());
  await visiblePhone(page).getByRole("button", { name: "Atender", exact: true }).click();
  await expect(visiblePhone(page).getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
  const phoneBox = await bounds(visiblePhone(page));
  const composerBox = await bounds(page.getByLabel("Compositor de mensagens"));
  expect(phoneBox.y + phoneBox.height).toBeLessThanOrEqual(composerBox.y);
  expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(741);
  await page.getByLabel("Mensagem", { exact: true }).fill("Celular livre");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada: Celular livre")).toBeVisible();
  await page.screenshot({ path: "test-results/telephony-sidebar-mobile-active.png", fullPage: true });
  await visiblePhone(page).getByRole("button", { name: "Desligar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar às conversas", exact: true }).click();
  await expect(page.getByTestId("sidebar-container")).toBeVisible();
  await expect(visiblePhone(page)).toHaveCount(1);
  await expect(visiblePhone(page).getByText("Ramal conectado")).toBeVisible();
});

test("landscape and the 768px breakpoint keep call controls and composer reachable", async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 390 });
  await page.goto("/tests/telephony/index.html");
  await connect(page);
  await page.getByRole("button", { name: "Conversa 1", exact: true }).click();
  await page.evaluate(() => window.phoneLayoutHarness.incoming());
  await visiblePhone(page).getByRole("button", { name: "Atender", exact: true }).click();
  await expect(visiblePhone(page).getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
  await page.getByLabel("Mensagem", { exact: true }).fill("Paisagem livre");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada: Paisagem livre")).toBeVisible();
  const composer = await bounds(page.getByLabel("Compositor de mensagens"));
  expect(composer.y + composer.height).toBeLessThanOrEqual(391);
  await page.screenshot({ path: "test-results/telephony-sidebar-mobile-landscape.png", fullPage: true });
  await page.setViewportSize({ width: 768, height: 600 });
  await expect(page.getByTestId("sidebar-container")).toBeVisible();
  await expect(visiblePhone(page)).toHaveCount(1);
  await expect(visiblePhone(page).getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
  const phone = await bounds(visiblePhone(page));
  const chat = await bounds(page.getByLabel("Área da conversa", { exact: true }));
  expect(phone.x + phone.width).toBeLessThanOrEqual(chat.x);
  await visiblePhone(page).getByRole("button", { name: "Desligar", exact: true }).click();
});
