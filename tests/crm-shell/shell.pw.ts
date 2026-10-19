import { test, expect } from "@playwright/test";
test("actual private layout preserves the active phone, composer and accepted send across routes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/crm-shell/index.html");
  await page.getByRole("button", { name: "Connect fixture", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("ready");
  await page.getByRole("button", { name: "Dial fixture", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(1);
  await page.evaluate(() => (window as any).phoneHarness.session.emit("confirmed"));
  await expect(page.getByTestId("phase")).toHaveText("active");
  await page.getByLabel("Message draft", { exact: true }).fill("Draft retained");
  for (const path of [
    "/tenant-a/customers",
    "/tenant-a/monitor",
    "/tenant-a/crm-campaigns",
    "/tenant-a/",
  ]) {
    await page.evaluate((path) => (window as any).shellFixture.navigate(path), path);
    await expect(page.getByRole("heading", { name: path, exact: true })).toBeVisible();
    await expect(page.getByLabel("Message draft", { exact: true })).toHaveValue("Draft retained");
    await expect(page.getByTestId("phase")).toHaveText("active");
  }
  await page.getByRole("button", { name: "Send fixture", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).shellFixture.state.sends.length))
    .toBe(1);
  await page.getByLabel("Message draft", { exact: true }).fill("Next draft");
  await page.evaluate(() => (window as any).shellFixture.navigate("/tenant-a/customer-segments"));
  await expect(page.getByLabel("Message draft", { exact: true })).toHaveValue("Next draft");
  await page.evaluate(() => (window as any).shellFixture.resolveSend());
  await expect(page.getByTestId("pending")).toHaveText("0");
  expect(await page.evaluate(() => (window as any).shellFixture.state.sends.length)).toBe(1);
  expect(await page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(1);
  expect(errors).toEqual([]);
});
