import { test, expect } from "@playwright/test";
const route = "/tests/production-pause/index.html";
const pause = async (page: any) => {
  await page.getByRole("region", { name: "Pausa do operador" }).getByRole("button", { name: "Pausar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pausa", exact: true });
  await dialog.getByRole("combobox", { name: "Motivo da pausa" }).click();
  await page.getByRole("option", { name: "Café" }).click();
  return dialog;
};
test("global pause stays on the real layout across navigation/reload and allows existing chat replies", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(route + "?dialer-off");
  await expect(page.getByRole("heading", { name: "/tenant-a/", exact: true })).toBeVisible({ timeout: 20_000 });
  const bar = page.getByRole("region", { name: "Pausa do operador" });
  await expect(bar.getByText("Disponível", { exact: true })).toBeVisible();
  await page.getByLabel("Message draft", { exact: true }).fill("Existing chat draft");
  const dialog = await pause(page);
  await expect(dialog.getByText(/Você pode responder e concluir as conversas já abertas/)).toBeVisible();
  await dialog.getByRole("button", { name: "Pausar agora", exact: true }).click();
  await expect(bar.getByText("Em pausa", { exact: true })).toBeVisible();
  await expect(bar.getByRole("timer", { name: "Tempo de pausa" })).toBeVisible();
  for (const path of ["/tenant-a/customers", "/tenant-a/monitor", "/tenant-a/"]) {
    await page.evaluate(path => (window as any).productionFixture.navigate(path), path);
    await expect(page.getByRole("heading", { name: path, exact: true })).toBeVisible();
    await expect(bar.getByText("Em pausa", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Message draft", { exact: true })).toHaveValue("Existing chat draft");
  }
  await page.getByRole("button", { name: "Send fixture", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).productionFixture.state.sends.length)).toBe(1);
  await page.evaluate(() => (window as any).productionFixture.resolveSend());
  await expect(page.getByTestId("pending")).toHaveText("0");
  await page.reload(); await expect(bar.getByText("Em pausa", { exact: true })).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await page.evaluate(() => (window as any).productionFixture.setTheme("dark"));
    await expect(bar.getByRole("button", { name: "Retomar", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`pause-${width}-dark.png`) });
  }
  await bar.getByRole("button", { name: "Retomar", exact: true }).click();
  await expect(bar.getByText("Disponível", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("404 and disabled runtime never claim the operator is available", async ({ page }) => {
  for (const query of ["?api404", "?runtime-off"]) {
    await page.goto(route + query);
    await expect(page.getByRole("heading", { name: "/tenant-a/", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pausa do operador" })).toHaveCount(0);
  }
  await page.goto(route);
  const bar = page.getByRole("region", { name: "Pausa do operador" });
  await expect(bar.getByText("Disponível", { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).productionFixture.api404 = true; window.dispatchEvent(new Event("focus")); });
  await expect(bar.getByText("Conferir estado", { exact: true })).toBeVisible();
  await expect(bar.getByText("Disponível", { exact: true })).toHaveCount(0);
});
test("mixed channel capability blocks new pauses while authenticated recovery stays available", async ({ page }) => {
  await page.goto(route + "?mixed&dialer-off");
  const bar = page.getByRole("region", { name: "Pausa do operador" });
  await expect(bar.getByText("WhatsApp não confirmado", { exact: true })).toBeVisible();
  await bar.getByRole("button", { name: "Opções de pausa" }).click();
  const dialog = page.getByRole("dialog", { name: "Pausa", exact: true });
  await dialog.getByRole("combobox", { name: "Motivo da pausa" }).click(); await page.getByRole("option", { name: "Café" }).click();
  await expect(dialog.getByRole("button", { name: "Pausar agora", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Após atendimento telefônico", exact: true })).toBeDisabled();
  await page.evaluate(() => { const f = (window as any).productionFixture; f.operator = { ...f.operator, state: "paused", version: 2, reasonId: 3, reason: "Café", startedAt: new Date().toISOString() }; });
  await dialog.getByRole("button", { name: "Atualizar estado", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Retomar", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Retomar", exact: true }).click();
  await page.evaluate(() => (window as any).productionFixture.logout());
  await expect(bar).toHaveCount(0);
});
test("modern manual and scheduled SIP wait for confirmed admission and preserve active media/composer across routes", async ({ page }) => {
  await page.goto(route);
  test.skip(await page.evaluate(() => (window as any).productionFixture.variant !== "modern"), "Legacy does not use SIP");
  await page.getByRole("button", { name: "Connect fixture", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("ready");
  await page.evaluate(() => { (window as any).productionFixture.holdPreparation = true; });
  await page.getByRole("button", { name: "Dial schedule fixture", exact: true }).click();
  await expect(page.getByTestId("phase")).toHaveText("preparing");
  await expect.poll(() => page.evaluate(() => typeof (window as any).productionFixture.releasePreparation)).toBe("function");
  expect(await page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(0);
  await page.evaluate(() => (window as any).productionFixture.releasePreparation());
  await expect.poll(() => page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(1);
  await page.evaluate(() => (window as any).phoneHarness.session.emit("confirmed"));
  await expect(page.getByTestId("phase")).toHaveText("active");
  await page.getByLabel("Message draft", { exact: true }).fill("Keep active draft");
  for (const path of ["/tenant-a/customers", "/tenant-a/monitor", "/tenant-a/"]) {
    await page.evaluate(path => (window as any).productionFixture.navigate(path), path);
    await expect(page.getByTestId("phase")).toHaveText("active");
    await expect(page.getByLabel("Message draft", { exact: true })).toHaveValue("Keep active draft");
  }
  await page.evaluate(() => (window as any).productionFixture.refreshToken());
  await expect(page.getByTestId("phase")).toHaveText("active");
  expect(await page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(1);
  await page.getByRole("button", { name: "Hangup fixture", exact: true }).click();
  await page.evaluate(async () => { await (window as any).productionFixture.runtime.waitForSync(); });
  await page.evaluate(() => { (window as any).productionFixture.holdPreparation = false; });
  await page.getByRole("button", { name: "Dial fixture", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(2);
  const prepares = await page.evaluate(() => (window as any).productionFixture.requests.filter((r: any) => r.path.endsWith("/telephony/calls") && r.method === "POST"));
  expect(prepares[0].body.scheduleId).toBe(42); expect(prepares[1].body.scheduleId).toBeUndefined();
});
test("paused modern phone blocks outgoing and incoming requires explicit resume even offline", async ({ page }) => {
  await page.goto(route);
  test.skip(await page.evaluate(() => (window as any).productionFixture.variant !== "modern"), "Legacy does not use SIP");
  const dialog = await pause(page); await dialog.getByRole("button", { name: "Pausar agora", exact: true }).click();
  await page.getByRole("button", { name: "Connect fixture", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("ready");
  await page.getByRole("button", { name: "Dial fixture", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Nenhuma chamada foi enviada" })).toBeVisible();
  expect(await page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(0);
  await page.evaluate(() => { (window as any).productionFixture.offline = true; (window as any).phoneHarness.incoming(); });
  await expect(page.getByTestId("phase")).toHaveText("incoming");
  expect(await page.evaluate(() => (window as any).phoneHarness.answers)).toBe(0);
  await page.getByRole("button", { name: "Retomar e atender", exact: true }).click();
  await expect(page.getByTestId("phase")).toHaveText("active");
  expect(await page.evaluate(() => (window as any).phoneHarness.answers)).toBe(1);
  await page.evaluate(async () => { const f = (window as any).productionFixture; f.offline = false; await f.runtime.waitForSync(); });
  const requests = await page.evaluate(() => (window as any).productionFixture.requests);
  expect(requests.some((r: any) => r.body.direction === "incoming")).toBe(true);
  expect(requests.some((r: any) => r.body.kind === "resume")).toBe(true);
  expect(requests.some((r: any) => r.body.type === "answered")).toBe(true);
});
test("modern outgoing fails closed on missing/unreachable/loading API and explicit OFF preserves legacy calls", async ({ page }) => {
  await page.goto(route + "?api404");
  test.skip(await page.evaluate(() => (window as any).productionFixture.variant !== "modern"), "Legacy does not use SIP");
  await page.getByRole("button", { name: "Connect fixture", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("ready");
  for (const mode of ["404", "offline"]) {
    await page.evaluate(mode => { const f = (window as any).productionFixture; f.api404 = mode === "404"; f.offline = mode === "offline"; }, mode);
    await page.getByRole("button", { name: "Dial fixture", exact: true }).click();
    await expect(page.getByTestId("phase")).toHaveText("failed");
    expect(await page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(0);
  }
  await page.evaluate(() => { const f = (window as any).productionFixture; f.api404 = false; f.offline = false; f.holdStatus = true; });
  await page.getByRole("button", { name: "Dial fixture", exact: true }).click();
  await expect(page.getByTestId("phase")).toHaveText("preparing");
  await expect.poll(() => page.evaluate(() => typeof (window as any).productionFixture.releaseStatus)).toBe("function");
  expect(await page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(0);
  await page.evaluate(() => (window as any).productionFixture.releaseStatus());
  await expect.poll(() => page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(1);
  await page.getByRole("button", { name: "Hangup fixture", exact: true }).click();
  await page.evaluate(async () => { await (window as any).productionFixture.runtime.waitForSync(); sessionStorage.removeItem("production-pause-fixture"); });
  await page.goto(route + "?runtime-off");
  await page.getByRole("button", { name: "Connect fixture", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("ready");
  await page.getByRole("button", { name: "Dial schedule fixture", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).phoneHarness.calls.length)).toBe(1);
  expect(await page.evaluate(() => (window as any).productionFixture.requests.some((r: any) => r.path.endsWith("/call/start")))).toBe(true);
});
test("actual legacy card keeps after-attendance pending through uncertain finish and reload until verified receipt", async ({ page }) => {
  await page.goto(route + "?card&dialer-off");
  test.skip(await page.evaluate(() => (window as any).productionFixture.variant !== "legacy"), "Legacy metadata-start contract");
  const card = page.getByRole("button").filter({ hasText: "Synthetic customer" }).first();
  await card.click(); await page.getByRole("button", { name: "Start actual card", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).productionFixture.requests.filter((r: any) => r.path.endsWith("/call/start")).length)).toBe(1);
  const dialog = await pause(page);
  await expect(dialog.getByRole("button", { name: "Após atendimento telefônico", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Após atendimento telefônico", exact: true }).click();
  const bar = page.getByRole("region", { name: "Pausa do operador" });
  await expect(bar.getByText("Pausa solicitada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish actual card", exact: true }).click();
  await page.evaluate(() => { (window as any).productionFixture.deferFinish = true; });
  const finish = page.getByRole("dialog", { name: "Finalização fixture", exact: true });
  await finish.getByRole("button", { name: "Confirm actual finish", exact: true }).click();
  await expect(finish.getByRole("alert")).toContainText("response lost");
  expect(await page.evaluate(() => (window as any).productionFixture.operator.state)).toBe("pending");
  await finish.getByRole("button", { name: "Close finish fixture", exact: true }).click();
  await expect(bar.getByText("Pausa solicitada", { exact: true })).toBeVisible();
  await page.reload();
  await expect(bar.getByText("Pausa solicitada", { exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).productionFixture.verifyFinishes());
  await bar.getByRole("button", { name: "Opções de pausa" }).click();
  const options = page.getByRole("dialog", { name: "Pausa", exact: true });
  await options.getByRole("button", { name: "Conferir finalização", exact: true }).click();
  await expect(options.getByRole("button", { name: "Conferir finalização", exact: true })).toHaveCount(0);
  await options.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(bar.getByText("Em pausa", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).productionFixture.finishWrites)).toBe(1);
});
