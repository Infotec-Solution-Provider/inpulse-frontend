import { expect, test } from "@playwright/test";

// Only isolated candidate processes. Authentication is rejected locally by the browser mock.
// No customer credentials, session, messages, or database writes are used.
test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/auth\//, (route) => route.fulfill({ status: 401, contentType: "application/json", body: '{"message":"synthetic anonymous session"}' }));
});

for (const width of [1440, 390, 320]) {
  test(`the old UI remains the default and both versions can be reached at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    const assets: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/_next/") && response.status() >= 400) assets.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    await page.goto("/transition-fixture/login");
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    const enterNew = page.getByRole("link", { name: "Experimentar nova versão", exact: true });
    await expect(enterNew).toHaveAttribute("href", "/nova/transition-fixture");
    await expect(page).toHaveURL(/\/transition-fixture\/login$/);
    await enterNew.click();
    await expect(page).toHaveURL(/\/nova\/transition-fixture\/login$/);
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    const returnOld = page.getByRole("link", { name: "Voltar à versão anterior", exact: true });
    await expect(returnOld).toHaveAttribute("href", "/transition-fixture");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await returnOld.click();
    await expect(page).toHaveURL(/\/transition-fixture\/login$/);
    await expect(enterNew).toBeVisible();
    await page.reload();
    await expect(enterNew).toBeVisible();
    expect(errors).toEqual([]);
    expect(assets).toEqual([]);
  });
}

test("assets and install metadata remain inside the new namespace", async ({ page, request }) => {
  await page.goto("/nova/transition-fixture/login");
  await expect(page.getByRole("link", { name: "Voltar à versão anterior" })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/nova/manifest.webmanifest");
  const manifest = await request.get("/nova/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const data = await manifest.json();
  expect(data.start_url).toBe("/nova/");
  expect(data.scope).toBe("/nova/");
  for (const icon of data.icons) {
    expect(icon.src).toMatch(/^\/nova\//);
    const response = await request.get(icon.src);
    expect(response.status()).toBe(200);
  }
  const scripts = await page.locator("script[src]").evaluateAll((elements) => elements.map((element) => new URL((element as HTMLScriptElement).src).pathname));
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.every((src) => src.startsWith("/nova/_next/"))).toBe(true);
});
