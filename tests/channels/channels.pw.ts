import { expect, test } from "@playwright/test";

function channel() {
  const now = new Date().toISOString();
  return {
    id: 1,
    name: "Canal de atendimento",
    phone: "5511900000000",
    stability: "ATTENTION",
    stabilityReason: "2 envios sem confirmação nos últimos 15 minutos.",
    disconnections24h: 8,
    connectedUptimeSeconds: 7200,
    snapshot: {
      state: "CONNECTED",
      lastObservedAt: now,
      lastConnectedAt: now,
      lastDisconnectedAt: null,
      processStartedAt: now,
    },
    functionalHealth: {
      completedAt: now,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      latencyMs: 1200,
      dispatchStatus: "PASSED",
      officialReceiveStatus: "PASSED",
      responseDispatchStatus: "PASSED",
      receiveStatus: "PASSED",
    },
    messageHealth: {
      windowMinutes: 15,
      observedAt: now,
      dataStatus: "COMPLETE",
      sendFailed: 0,
      sendTechnicalFailed: 0,
      sendMessageFailed: 0,
      sendUnclassifiedFailed: 0,
      sendUnknown: 2,
      sendDelayed: 0,
      receiveFailed: 0,
      receiveDelayed: 0,
      oldestSendPendingAt: null,
      oldestReceivePendingAt: null,
    },
    events: [],
  };
}

for (const width of [1440, 390]) {
  test(`shows real-message health and functional checks at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/whatsapp/session-monitor/**", (route) =>
      route.fulfill({ json: route.request().url().endsWith("/1") ? channel() : [channel()] }),
    );
    await page.goto("/tests/channels/index.html");
    await expect(page.getByText("2 envios sem confirmação nos últimos 15 minutos.")).toBeVisible();
    await expect(page.getByText(/Teste aprovado/)).toBeVisible();
    await page
      .getByRole("button", { name: "Saúde do canal e histórico de 24 horas", exact: true })
      .click();
    const modal = page.locator(".MuiModal-root");
    await expect(modal.getByText("Healthcheck funcional")).toBeVisible();
    await expect(modal.getByText("Recebimento na sessão")).toBeVisible();
    await expect(modal.getByText("Envios sem confirmação", { exact: true })).toBeVisible();
    await expect(modal.getByText(/Mensagens · últimos 15 minutos/)).toBeVisible();
    await page.screenshot({ path: info.outputPath("channel-health.png"), fullPage: true });
    await modal.getByRole("button", { name: "Fechar" }).click();
    expect(errors).toEqual([]);
  });
}

test("shows unavailable data without presenting zero failures", async ({ page }) => {
  const item = {
    ...channel(),
    messageHealth: null,
    functionalHealth: null,
    stabilityReason: "Não foi possível consultar a saúde das mensagens.",
  };
  await page.route("**/api/whatsapp/session-monitor/**", (route) =>
    route.fulfill({ json: route.request().url().endsWith("/1") ? item : [item] }),
  );
  await page.goto("/tests/channels/index.html");
  await expect(page.getByText(/Sem teste/)).toBeVisible();
  await page
    .getByRole("button", { name: "Saúde do canal e histórico de 24 horas", exact: true })
    .click();
  await expect(page.getByText("Dados de mensagens indisponíveis.")).toBeVisible();
  await expect(page.getByText("Falhas técnicas de envio", { exact: true })).toHaveCount(0);
});
