import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/chat-preferences/index.html");
});

test("marking a closed chat unread does not open or read it; opening it explicitly reads it", async ({ page }) => {
  await page.getByRole("button", { name: "Ações da conversa", exact: true }).click();
  await page.getByRole("menuitem", { name: "Marcar como não lida" }).click();
  const chat = page.getByRole("listitem");
  await expect(chat).toHaveAttribute("aria-busy", "true");
  await expect(chat).toHaveAttribute("aria-selected", "false");
  await expect(page.getByTestId("events")).toHaveText('["unread-preference"]');
  await page.getByText("Conversa de teste", { exact: true }).click();
  await expect(chat).toHaveAttribute("aria-busy", "false");
  await expect(chat).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("events")).toHaveText('["unread-preference","open/read"]');
});

for (const key of ["Enter", "Space"]) {
  test(`keyboard ${key} on the action button opens only the menu`, async ({ page }) => {
    const actions = page.getByRole("button", { name: "Ações da conversa", exact: true });
    await actions.focus();
    await actions.press(key);
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByTestId("events")).toHaveText("[]");
    await page.getByRole("menuitem", { name: "Marcar como não lida" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listitem")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("events")).toHaveText('["unread-preference"]');
  });
}

test("marking the selected chat unread does not invoke another open/read", async ({ page }) => {
  await page.goto("/tests/chat-preferences/index.html?selected=1");
  await page.getByRole("button", { name: "Ações da conversa", exact: true }).click();
  await page.getByRole("menuitem", { name: "Marcar como não lida" }).click();
  await expect(page.getByRole("listitem")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("listitem")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("events")).toHaveText('["unread-preference"]');
});

test("pin and unpin actions never invoke open/read", async ({ page }) => {
  await page.getByRole("button", { name: "Ações da conversa", exact: true }).click();
  await page.getByRole("menuitem", { name: "Fixar conversa", exact: true }).click();
  await expect(page.getByTestId("events")).toHaveText('["pin"]');
  await page.getByRole("button", { name: "Ações da conversa", exact: true }).click();
  await page.getByRole("menuitem", { name: "Desafixar conversa", exact: true }).click();
  await expect(page.getByTestId("events")).toHaveText('["pin","unpin"]');
  await expect(page.getByRole("listitem")).toHaveAttribute("aria-selected", "false");
});
