import { expect, test } from "@playwright/test";

for (const official of [false, true]) {
  for (const denied of [false, true]) {
    test(`${official ? "official template" : "common channel"}: ${denied ? "shows the server denial once and keeps the dialog" : "completes after the server accepts"}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let requests = 0;
      await page.route("**/api/whatsapp/chats", async (route) => {
        requests++;
        const body = route.request().postDataJSON();
        expect(body.contactId).toBe(8);
        expect(Boolean(body.template)).toBe(official);
        await route.fulfill({
          status: denied ? 403 : 200,
          json: denied ? { message: "Este contato está fidelizado a outro operador." } : { data: {} },
        });
      });
      await page.goto(`/tests/chat-start/index.html${official ? "?official=1" : ""}`);
      await page.getByRole("button", { name: "Iniciar conversa" }).click();
      if (official) {
        await expect(page.getByRole("heading", { name: "Enviar Template" })).toBeVisible();
        await page.getByRole("combobox", { name: "Template" }).click();
        await page.getByRole("option", { name: "Boas-vindas" }).click();
        await page.getByRole("button", { name: "Enviar", exact: true }).click();
      }
      if (denied) {
        await expect(page.getByRole("alert")).toHaveCount(1);
        await expect(page.getByRole("alert")).toContainText("Este contato está fidelizado a outro operador.");
        await expect(page.getByTestId("selected")).toHaveText("0");
        await expect(page.getByTestId("closed")).toHaveText("0");
        if (official) await expect(page.getByRole("heading", { name: "Enviar Template" })).toBeVisible();
      } else {
        await expect(page.getByTestId(official ? "closed" : "selected")).toHaveText("1");
        await expect(page.getByRole("alert")).toHaveCount(0);
      }
      expect(requests).toBe(1);
      expect(errors).toEqual([]);
    });
  }
}
