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

test("global pause survives routes and document reload while SIP remains disconnected", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/tests/crm-shell/index.html?runtime&all-channels");
  const pause = page.getByRole("region", { name: "Pausa do operador", exact: true });
  await expect(pause).toHaveCount(1);
  await expect(pause).toContainText("Disponível");
  await expect(pause).toContainText("Ligações e WhatsApp");
  await expect(page.getByTestId("connection")).toHaveText("disconnected");
  await pause.getByRole("button", { name: "Pausar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pausa", exact: true });
  await expect(dialog).toContainText("Você pode responder e concluir as conversas já abertas.");
  await dialog.getByLabel("Motivo da pausa", { exact: true }).click();
  await page.getByRole("option", { name: "Café", exact: true }).click();
  await dialog.getByRole("button", { name: "Pausar agora", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(pause).toContainText("Em pausa");
  await expect(pause).toContainText("Café");
  const startedAt = await page.evaluate(() => (window as any).phoneHarness.runtimeState.startedAt);
  expect(startedAt).toBeTruthy();
  for (const path of ["/tenant-a/customers", "/tenant-a/monitor", "/tenant-a/crm-campaigns", "/tenant-a/"]) {
    await page.evaluate(path => (window as any).shellFixture.navigate(path), path);
    await expect(page.getByRole("heading", { name: path, exact: true })).toBeVisible();
    await expect(pause).toHaveCount(1);
    await expect(pause).toContainText("Em pausa");
    await expect(pause.getByRole("timer", { name: "Tempo de pausa" })).toBeVisible();
    await expect(pause.getByRole("button", { name: "Retomar", exact: true })).toBeInViewport();
  }
  await page.getByRole("button", { name: "Preferência de tema", exact: true }).click();
  await page.getByRole("menuitem", { name: "Escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await expect(pause.getByRole("button", { name: "Retomar", exact: true })).toBeInViewport();
    await expect(pause.getByRole("timer", { name: "Tempo de pausa" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results-crm-shell/global-pause-dark-${width}.png`, fullPage: true });
  }
  await page.reload();
  await expect(pause).toHaveCount(1);
  await expect(pause).toContainText("Em pausa");
  await expect(pause).toContainText("Café");
  expect(await page.evaluate(() => (window as any).phoneHarness.runtimeState.startedAt)).toBe(startedAt);
  await expect(page.getByTestId("connection")).toHaveText("disconnected");
  await expect(page.getByTestId("phase")).toHaveText("idle");
  expect(await page.evaluate(() => ({ calls: (window as any).phoneHarness.calls, session: (window as any).phoneHarness.session }))).toEqual({ calls: [], session: null });
  await pause.getByRole("button", { name: "Retomar", exact: true }).click();
  await expect(pause).toContainText("Disponível");
  await expect(pause.getByRole("timer")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).phoneHarness.runtimeState.state)).toBe("available");
  expect(errors).toEqual([]);
});

test("global pending and exceeded states stay explicit and can be canceled or resumed", async ({ page }) => {
  await page.goto("/tests/crm-shell/index.html?runtime&all-channels");
  const pause = page.getByRole("region", { name: "Pausa do operador", exact: true });
  await expect(pause).toContainText("Disponível");
  await page.evaluate(() => Object.assign((window as any).phoneHarness.runtimeState, { state: "pending", reasonId: 1, version: 2 }));
  await pause.getByRole("button", { name: "Opções de pausa", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pausa", exact: true });
  await expect(dialog).toContainText("Pausa solicitada");
  await expect(dialog).toContainText("Novos atendimentos no WhatsApp já estão bloqueados.");
  await expect(dialog).toContainText("finalização do atendimento telefônico atual.");
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(pause).toContainText("Pausa solicitada");
  await expect(pause.getByRole("timer")).toHaveCount(0);
  await pause.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(pause).toContainText("Disponível");
  await page.evaluate(() => Object.assign((window as any).phoneHarness.runtimeState, { state: "paused", reasonId: 1, version: 4, startedAt: new Date(Date.now() - 120_000).toISOString(), maxSeconds: 60 }));
  await pause.getByRole("button", { name: "Opções de pausa", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Tempo previsto de pausa excedido.");
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(pause).toContainText("Limite excedido");
  await expect(pause.getByRole("timer", { name: "Tempo de pausa" })).toBeVisible();
  await pause.getByRole("button", { name: "Retomar", exact: true }).click();
  await expect(pause).toContainText("Disponível");
  expect(await page.evaluate(() => (window as any).phoneHarness.calls)).toEqual([]);
  await expect(page.getByTestId("connection")).toHaveText("disconnected");
});

test("authenticated operators can pause with the dialer off and keep replying to an open chat", async ({ page }) => {
  await page.goto("/tests/crm-shell/index.html?runtime&all-channels&dialer-off");
  const pause = page.getByRole("region", { name: "Pausa do operador", exact: true });
  await expect(pause).toContainText("Ligações e WhatsApp");
  await expect(pause).toContainText("Disponível");
  await page.getByRole("button", { name: "Connect fixture", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("disconnected");
  await page.getByLabel("Message draft", { exact: true }).fill("Conversa já aberta");
  await pause.getByRole("button", { name: "Pausar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pausa", exact: true });
  await expect(dialog).toContainText("novos atendimentos no WhatsApp");
  await expect(dialog).toContainText("responder e concluir as conversas já abertas");
  await dialog.getByLabel("Motivo da pausa", { exact: true }).click();
  await page.getByRole("option", { name: "Café", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Pausar agora", exact: true })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Após atendimento telefônico", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Pausar agora", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(pause).toContainText("Em pausa");
  await expect(page.getByLabel("Message draft", { exact: true })).toHaveValue("Conversa já aberta");
  await page.getByRole("button", { name: "Send fixture", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).shellFixture.state.sends.length)).toBe(1);
  await page.evaluate(() => (window as any).shellFixture.resolveSend());
  await expect(page.getByTestId("pending")).toHaveText("0");
  await pause.getByRole("button", { name: "Retomar", exact: true }).click();
  await expect(pause).toContainText("Disponível");
  expect(await page.evaluate(() => ({ calls: (window as any).phoneHarness.calls, uaStarts: (window as any).phoneHarness.uaStarts, configReads: (window as any).phoneHarness.webrtcConfigReads }))).toEqual({ calls: [], uaStarts: 0, configReads: 0 });
});

test("unconfirmed WhatsApp capability blocks new pause requests while recovery stays available", async ({ page }) => {
  await page.goto("/tests/crm-shell/index.html?runtime&all-channels&dialer-off&mixed-capability");
  const pause = page.getByRole("region", { name: "Pausa do operador", exact: true });
  await expect(pause).toContainText("WhatsApp não confirmado");
  await pause.getByRole("button", { name: "Opções de pausa", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pausa", exact: true });
  await expect(dialog).toContainText("Escopo confirmado: Telefonia.");
  await expect(dialog).not.toContainText("A pausa bloqueia novas ligações e novos atendimentos no WhatsApp.");
  await expect(dialog).toContainText("Não foi possível confirmar o bloqueio de novos atendimentos no WhatsApp.");
  await dialog.getByLabel("Motivo da pausa", { exact: true }).click();
  await page.getByRole("option", { name: "Café", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Pausar agora", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Após atendimento telefônico", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).phoneHarness.runtimeState.version)).toBe(1);
  await page.evaluate(() => Object.assign((window as any).phoneHarness.runtimeState, { state: "paused", version: 2, reasonId: 1, startedAt: new Date().toISOString() }));
  await dialog.getByRole("button", { name: "Atualizar estado", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Retomar", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(pause).toContainText("Em pausa");
  await pause.getByRole("button", { name: "Retomar", exact: true }).click();
  await expect(pause.getByRole("timer")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).phoneHarness.runtimeState.state)).toBe("available");
  expect(await page.evaluate(() => (window as any).phoneHarness.uaStarts)).toBe(0);
});
