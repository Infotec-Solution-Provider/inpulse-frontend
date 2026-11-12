import { expect, test, type Page, type Route } from "@playwright/test";

const fixture = "/tests/reactions/index.html";
const reactionEndpoint = "**/api/whatsapp/3/messages/17/reaction";
const action = (page: Page) => page.getByRole("button", { name: /^(Reagir à mensagem|Alterar reação desta conta WhatsApp)$/, includeHidden: true });
const chip = (page: Page) => page.getByRole("button", { name: /Ver quem reagiu$/, includeHidden: true });

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin !== "http://127.0.0.1:4197" || url.pathname.startsWith("/api/")
      ? route.abort() : route.continue();
  });
});

async function selectEmoji(page: Page, unified: string) {
  await action(page).click();
  await page.locator(`button[data-unified="${unified}"]`).click();
}

function snapshot(emoji: string, revision: number) {
  const reactedAt = new Date(Date.now() + revision).toISOString();
  return {
    messageId: 17, messageType: "wpp", clientId: 3, reactionsUpdatedAt: reactedAt,
    reactions: emoji ? [{
      actorId: "self", emoji, fromMe: true, reactedAt,
      internalUserId: 7, internalUserName: "Ana",
    }] : [],
  };
}

test("WABA oferece seletor e só confirma envio, troca e remoção após resposta da API", async ({ page }) => {
  const requests: Route[] = [];
  await page.route(reactionEndpoint, (route) => { requests.push(route); });
  await page.goto(fixture);
  await expect(page.getByText("Mensagem de teste WABA")).toBeVisible();
  await selectEmoji(page, "1f44d");
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].request().postDataJSON()).toEqual({ emoji: "👍" });
  expect(requests[0].request().headers().authorization).toBe("Bearer fixture-token");
  await expect(page.getByRole("status")).toHaveText("Aguardando confirmação da reação...");
  await expect(action(page)).toBeDisabled();
  await expect(chip(page)).toHaveCount(0);
  await requests[0].fulfill({ json: { data: snapshot("👍", 1) } });
  await expect(chip(page)).toHaveAccessibleName("👍: Ana. Ver quem reagiu");

  await selectEmoji(page, "2764-fe0f");
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].request().postDataJSON()).toEqual({ emoji: "❤️" });
  await expect(chip(page)).toHaveAttribute("aria-label", "👍: Ana. Ver quem reagiu");
  await requests[1].fulfill({ json: { data: snapshot("❤️", 2) } });
  await expect(chip(page)).toHaveAccessibleName("❤️: Ana. Ver quem reagiu");

  await action(page).click();
  await page.getByRole("button", { name: "Remover reação desta conta" }).click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2].request().postDataJSON()).toEqual({ emoji: "" });
  await expect(chip(page)).toHaveCount(1);
  await requests[2].fulfill({ json: { data: snapshot("", 3) } });
  await expect(chip(page)).toHaveCount(0);
  await expect(action(page)).toHaveAccessibleName("Reagir à mensagem");
  expect(requests).toHaveLength(3);
});

for (const failure of ["error", "timeout", "invalid-confirmation"]) {
  test(`WABA ${failure} não inventa confirmação nem repete a requisição`, async ({ page }) => {
    let attempts = 0;
    await page.route(reactionEndpoint, async (route) => {
      attempts += 1;
      if (failure === "timeout") return;
      if (failure === "error") await route.fulfill({ status: 503, json: { message: "Falha de teste do provedor" } });
      else await route.fulfill({ json: { data: { ...snapshot("👍", 1), clientId: 99 } } });
    });
    await page.goto(`${fixture}?case=${failure}`);
    await selectEmoji(page, "1f44d");
    await expect(page.getByTestId("errors")).not.toBeEmpty();
    await expect(chip(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(action(page)).toBeEnabled();
    // Give an unintended automatic retry time to dispatch, including after timeout.
    await page.waitForTimeout(350);
    expect(attempts).toBe(1);
  });
}

test("WABA respeita conversa, leitura, IDs e status; REMOTE e WWEBJS continuam disponíveis", async ({ page }) => {
  let attempts = 0;
  await page.route(reactionEndpoint, () => { attempts += 1; });
  for (const scenario of [
    "readonly", "selection", "missing-waba", "missing-channel", "different-channel",
    "different-chat", "finished", "group", "pending", "system", "old", "GUPSHUP",
  ]) {
    await page.goto(`${fixture}?case=${scenario}`);
    await expect(page.getByText("Mensagem de teste WABA")).toBeVisible();
    await expect(action(page), scenario).toHaveCount(0);
  }
  for (const provider of ["REMOTE", "WWEBJS", "outbound"]) {
    await page.goto(`${fixture}?case=${provider}`);
    await expect(action(page), provider).toBeVisible();
  }
  expect(attempts).toBe(0);
});
