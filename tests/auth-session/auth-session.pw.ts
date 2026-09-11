import { expect, test, type Page } from "@playwright/test";
import type {} from "./harness";

async function waitForRefresh(page: Page, calls: number) {
  await expect.poll(() => page.evaluate(() => window.authHarness.state.refreshCalls)).toBe(calls);
  await expect.poll(() => page.evaluate(() => window.authHarness.state.pending.length)).toBe(1);
}

async function authenticate(page: Page) {
  await waitForRefresh(page, 1);
  await page.evaluate(() => window.authHarness.resolveRefresh());
  await expect(page.getByTestId("status")).toHaveText("authenticated");
  await page.getByLabel("Message draft").fill("Draft must survive refresh");
}

async function expectPrivateScreenPreserved(page: Page) {
  await expect(page.getByTestId("status")).toHaveText("authenticated");
  await expect(page.getByTestId("authenticated")).toHaveText("true");
  await expect(page.getByLabel("Message draft")).toHaveValue("Draft must survive refresh");
  expect(await page.evaluate(() => window.authHarness.mounts)).toBe(1);
  expect(await page.evaluate(() => window.authHarness.statuses)).toEqual(["authenticated"]);
  await expect(page.getByText(/Reconectando sua/)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  // Refuse all external traffic, including accidental use of a real API.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" && url.port === "4179" ? route.continue() : route.abort();
  });
  await page.clock.install();
  await page.goto("/tests/auth-session/index.html");
});

test("initial cookie refresh displays loading until the session is known", async ({ page }) => {
  await waitForRefresh(page, 1);
  await expect(page.getByText(/Carregando sua/)).toBeVisible();
  await expect(page.getByText(/Reconectando sua/)).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveCount(0);
  await authenticate(page);
});

test("refresh keeps authentication and the mounted screen while replacing the token", async ({ page }) => {
  await authenticate(page);
  const previousToken = await page.getByTestId("token").textContent();
  await page.evaluate(() => window.authHarness.startRefresh());
  await waitForRefresh(page, 2);
  await expectPrivateScreenPreserved(page);
  await page.evaluate(() => window.authHarness.resolveRefresh());
  await expect(page.getByTestId("token")).not.toHaveText(previousToken!);
  await expectPrivateScreenPreserved(page);
});

test("the timer renews the token before expiry without disturbing the screen", async ({ page }) => {
  await authenticate(page);
  await page.clock.runFor(240_000);
  await waitForRefresh(page, 2);
  const remainingLifetime = await page.getByTestId("token").evaluate((element) => {
    const payload = JSON.parse(atob(element.textContent!.split(".")[1]));
    return payload.exp * 1_000 - Date.now();
  });
  expect(remainingLifetime).toBeGreaterThan(0);
  expect(remainingLifetime).toBeLessThanOrEqual(60_000);
  await expectPrivateScreenPreserved(page);
  await page.evaluate(() => window.authHarness.resolveRefresh());
  await expectPrivateScreenPreserved(page);
});

test("transient refresh failures and the later recovery retry preserve the screen", async ({ page }) => {
  await authenticate(page);
  await page.evaluate(() => window.authHarness.startRefresh());
  await waitForRefresh(page, 2);
  await page.evaluate(() => window.authHarness.rejectRefresh(503));
  await page.clock.runFor(1_000);
  await waitForRefresh(page, 3);
  await expectPrivateScreenPreserved(page);
  await page.evaluate(() => window.authHarness.rejectRefresh(503));
  await page.clock.runFor(2_000);
  await waitForRefresh(page, 4);
  await page.evaluate(() => window.authHarness.rejectRefresh(503));
  await expect.poll(() => page.evaluate(() => window.authHarness.lastRefreshResult)).toBe("rejected");
  await expectPrivateScreenPreserved(page);
  await page.clock.runFor(5_000);
  await waitForRefresh(page, 5);
  await page.evaluate(() => window.authHarness.resolveRefresh());
  await expectPrivateScreenPreserved(page);
});

test("a definitive 401 clears the local session and redirects to login", async ({ page }) => {
  await authenticate(page);
  await page.evaluate(() => window.authHarness.startRefresh());
  await waitForRefresh(page, 2);
  await page.evaluate(() => window.authHarness.rejectRefresh(401));
  await expect.poll(() => page.evaluate(() => window.authHarness.state.redirects)).toContain("/test-tenant/login");
  await expect(page.getByTestId("status")).toHaveText("anonymous");
  await expect(page.getByTestId("authenticated")).toHaveText("false");
  await expect(page.getByTestId("token")).toHaveText("none");
});

test("navigation in the same tenant does not invalidate a refresh in flight", async ({ page }) => {
  await authenticate(page);
  await page.evaluate(() => window.authHarness.startRefresh());
  await waitForRefresh(page, 2);
  await page.evaluate(() => window.authHarness.navigate("/test-tenant/chats"));
  await expect(page.getByTestId("pathname")).toHaveText("/test-tenant/chats");
  await page.evaluate(() => window.authHarness.resolveRefresh());
  await expect.poll(() => page.evaluate(() => window.authHarness.lastRefreshResult)).toBe("resolved");
  await expectPrivateScreenPreserved(page);
});

test("logout during refresh cannot restore the previous session", async ({ page }) => {
  await authenticate(page);
  await page.evaluate(() => window.authHarness.startRefresh());
  await waitForRefresh(page, 2);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect.poll(() => page.evaluate(() => window.authHarness.state.redirects)).toContain("/test-tenant/login");
  await page.evaluate(() => window.authHarness.resolveRefresh());
  await expect.poll(() => page.evaluate(() => window.authHarness.lastRefreshResult)).toBe("rejected");
  await expect(page.getByTestId("status")).toHaveText("anonymous");
  await expect(page.getByTestId("token")).toHaveText("none");
});
