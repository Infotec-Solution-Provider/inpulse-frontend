import { expect, test } from "@playwright/test";
import type {} from "./harness";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" && url.port === "4199" ? route.continue() : route.abort();
  });
  await page.goto("/tests/channel-selection/index.html");
  await expect(page.getByPlaceholder("Mensagem")).toBeVisible();
});

test("selects the conversation channel when its history arrives after opening", async ({
  page,
}) => {
  await expect(page.getByTestId("selected")).toHaveText("5");
  await page.evaluate(() =>
    window.channelHarness.history([{ id: 20, contactId: 101, clientId: 11 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("11");
  await expect(page.getByTitle("Canal remoto", { exact: true })).toBeVisible();
});

test("revises a partial history and ignores trailing system messages without channel", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.channelHarness.open(2, [{ id: 10, contactId: 102, clientId: 5 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("5");
  await page.evaluate(() =>
    window.channelHarness.history([
      { id: 10, contactId: 102, clientId: 5 },
      { id: 20, contactId: 102, clientId: 11 },
      { id: 21, contactId: 102, clientId: null },
    ]),
  );
  await expect(page.getByTestId("selected")).toHaveText("11");
});

test("uses the latest message summary immediately and ignores older out-of-order history", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.channelHarness.open(2, [], { id: 30, contactId: 102, clientId: 11 }),
  );
  await expect(page.getByTestId("selected")).toHaveText("11");
  await page.evaluate(() =>
    window.channelHarness.history([
      { id: 30, contactId: 102, clientId: 11 },
      { id: 10, contactId: 102, clientId: 5 },
    ]),
  );
  await expect(page.getByTestId("selected")).toHaveText("11");
  await page.evaluate(() =>
    window.channelHarness.history([{ id: 40, contactId: 102, clientId: 5 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("5");
});

test("keeps an explicit choice across delayed history, status updates and reopening", async ({
  page,
}) => {
  await page.getByTitle("Canal oficial", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Canal remoto" }).click();
  await page.evaluate(() =>
    window.channelHarness.history([{ id: 20, contactId: 101, clientId: 5 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("11");
  await page.evaluate(() =>
    window.channelHarness.open(2, [{ id: 30, contactId: 102, clientId: 5 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("5");
  await page.evaluate(() =>
    window.channelHarness.open(1, [{ id: 20, contactId: 101, clientId: 5 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("11");
});

test("does not carry the previous conversation channel into an empty conversation", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.channelHarness.open(1, [{ id: 20, contactId: 101, clientId: 11 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("11");
  await page.evaluate(() => window.channelHarness.open(2));
  await expect(page.getByTestId("selected")).toHaveText("5");
  await page.evaluate(() =>
    window.channelHarness.history([{ id: 20, contactId: 101, clientId: 11 }]),
  );
  await expect(page.getByTestId("selected")).toHaveText("5");
});

test("retries selection when the available channels arrive later", async ({ page }) => {
  await page.evaluate(() => window.channelHarness.channels([]));
  await page.evaluate(() =>
    window.channelHarness.history([{ id: 20, contactId: 101, clientId: 11 }]),
  );
  await page.evaluate(() => window.channelHarness.channels([5, 11]));
  await expect(page.getByTestId("selected")).toHaveText("11");
});

test("preserves incoming-channel updates and ignores unavailable channels", async ({ page }) => {
  await page.evaluate(() => window.channelHarness.receive(11));
  await expect(page.getByTestId("selected")).toHaveText("11");
  await page.evaluate(() => window.channelHarness.channels([5]));
  await expect(page.getByTestId("selected")).toHaveText("5");
  await page.evaluate(() => window.channelHarness.channels([]));
  await expect(page.getByTestId("selected")).toHaveText("none");
});
