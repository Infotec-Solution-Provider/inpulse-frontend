import { expect, test, type Page } from "@playwright/test";
import type {} from "./scroll-harness";

const listSelector = '[data-testid="message-slot"] > div';

async function layout(page: Page) {
  return page.evaluate(() => {
    const bounds = ["app-header", "workspace", "chat-panel", "chat-header", "chat-composer"]
      .map((id) => {
        const element = document.querySelector(`[data-testid="${id}"]`)!;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { id, x, y, width, height };
      });
    const ancestors = [];
    let ancestor = document.querySelector('[data-testid="message-slot"]') as HTMLElement | null;
    while (ancestor) {
      ancestors.push({ tag: ancestor.tagName, top: ancestor.scrollTop, left: ancestor.scrollLeft });
      ancestor = ancestor.parentElement;
    }
    return { bounds, ancestors, pageX: window.scrollX, pageY: window.scrollY };
  });
}

async function settleScroll(page: Page) {
  // Both delayed renderer effects use 100 ms. Sample after them and two paints.
  await page.waitForTimeout(160);
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  ));
}

async function expectListAtBottom(page: Page) {
  await expect.poll(() => page.locator(listSelector).evaluate((element) =>
    Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop),
  )).toBeLessThanOrEqual(1);
}

for (const kind of ["wpp", "internal", "group"]) {
  for (const length of ["short", "long"]) {
    test(`${kind} ${length}: pending and confirmed sends keep the whole chat in place`, async ({ page }) => {
      await page.setViewportSize({ width: 1000, height: 900 });
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        return url.hostname === "127.0.0.1" && url.port === "4181" && !url.pathname.startsWith("/api/")
          ? route.continue() : route.abort();
      });
      await page.goto(`/tests/chat-send/scroll.html?kind=${kind}&length=${length}`);
      await expect(page.getByLabel("Message draft")).toBeVisible();
      await settleScroll(page);
      await expectListAtBottom(page);
      // Restore the surrounding view after mounting so only send-triggered
      // scrolling contributes to the before/after measurement.
      await page.evaluate(() => {
        let ancestor = document.querySelector('[data-testid="message-slot"]') as HTMLElement | null;
        while (ancestor) { ancestor.scrollTop = 0; ancestor.scrollLeft = 0; ancestor = ancestor.parentElement; }
        window.scrollTo(0, 0);
      });
      const draft = page.getByLabel("Message draft");
      await draft.fill("First outgoing message");
      const before = await layout(page);
      for (const [index, text] of ["First outgoing message", "Second outgoing message"].entries()) {
        if (index) await draft.fill(text);
        await draft.press("Enter");
        await expect(draft).toHaveValue("");
        await expect(page.locator("[data-pending-send-id]")).toHaveCount(index + 1);
        await settleScroll(page);
        expect(await layout(page)).toEqual(before);
        await expectListAtBottom(page);
      }
      expect(await page.evaluate(() => window.chatScrollHarness.state.sends.length)).toBe(1);
      for (const index of [0, 1]) {
        await page.evaluate((sendIndex) => window.chatScrollHarness.confirm(sendIndex), index);
        await expect(page.locator("[data-pending-send-id]")).toHaveCount(1 - index);
        await expect(page.locator(`[data-message-id="${800 + index}"]`)).toBeVisible();
        await settleScroll(page);
        expect(await layout(page)).toEqual(before);
        await expectListAtBottom(page);
      }
    });
  }
}
