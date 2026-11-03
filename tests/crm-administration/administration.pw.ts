import { test, expect, type Page } from "@playwright/test";
const url = "/tests/crm-administration/index.html";
const snapshot = {
  customers: [{ CODIGO: "1", RAZAO: "Cliente Alfa", OPERADOR: "10", COD_CAMPANHA: "3" }],
  schedules: [
    {
      CODIGO: "7",
      CLIENTE: "1",
      CAMPANHA: "3",
      OPERADOR: "10",
      FIDELIZA: "S",
      DT_AGENDAMENTO: "2026-12-01 10:00:00",
    },
  ],
  loyalties: [
    { CODIGO: "5", CLIENTE: "1", CC_CODIGO: "3", OPERADOR_CRIACAO: "10", QTDE_FIDELIZAR: "8" },
  ],
  operators: [],
};
async function fixture(page: Page, unknown = false) {
  const calls: { path: string; headers: Record<string, string>; body: any }[] = [],
    state = { confirmed: false };
  await page.route("**/api/crm-administration/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      body = request.postDataJSON();
    calls.push({ path, headers: request.headers(), body });
    let data: any = {};
    if (path.includes("/options/operators"))
      data = {
        items:
          new URL(request.url()).searchParams.get("activeOnly") === "true"
            ? [{ id: 20, name: "Destino", active: "SIM" }]
            : [
                { id: 10, name: "Origem", active: "SIM" },
                { id: 20, name: "Destino", active: "SIM" },
              ],
        hasMore: false,
        nextAfter: null,
      };
    else if (path.includes("/options/campaigns"))
      data = { items: [{ id: 3, name: "Campanha A" }], hasMore: false, nextAfter: null };
    else if (path.endsWith("/customers"))
      data = {
        items: [{ id: 1, name: "Cliente Alfa", operatorId: 10, campaignId: 3 }],
        hasMore: false,
        nextAfter: null,
      };
    else if (path.endsWith("/blocks"))
      data = {
        items: [
          {
            id: 4,
            blocked: "N",
            createdAt: "2026-11-03 10:00:00",
            scheduleId: 7,
            customerId: 1,
            customerName: "Cliente Alfa",
            campaignId: 3,
            campaignName: "Campanha A",
            result: 12,
          },
        ],
        hasMore: false,
        nextAfter: null,
      };
    else if (path.endsWith("/transfers/preview"))
      data = {
        mode: "transfer",
        customerIds: [1],
        source: 10,
        destination: 20,
        version: "a".repeat(64),
        snapshot,
        executionAvailable: true,
        blockedReason: null,
        effects: {
          customers: snapshot.customers,
          schedules: snapshot.schedules,
          loyalties: snapshot.loyalties,
        },
        preserved: ["Histórico de atendimentos", "Contadores de fidelização"],
        scope: "Todos os vínculos da origem nos clientes selecionados, inclusive outras campanhas.",
      };
    else if (path.endsWith("/releases/preview"))
      data = {
        mode: "release",
        customerIds: [1],
        snapshot,
        executionAvailable: false,
        blockedReason: "Execução aguarda definição dos vínculos e agendas.",
        effects: { history: "PRESERVED" },
      };
    else if (path.endsWith("/blocks/preview"))
      data = {
        items: [{ id: 4 }],
        decision: body.decision,
        executionAvailable: false,
        blockedReason: "Aprovar e reprovar aguardam definição do bloqueio e resultado de campanha.",
        effects: { history: "PRESERVED" },
      };
    else if (path.includes("/operations/"))
      data = {
        operationId: path.split("/").at(-1),
        status: state.confirmed ? "applied" : "unconfirmed",
        ...(state.confirmed
          ? { transferId: 41 }
          : { message: "Comprovante ainda não encontrado. Aguarde." }),
      };
    else if (path.endsWith("/items"))
      data = {
        items: [{ id: 1, name: "Cliente Alfa", campaignId: 3 }],
        hasMore: false,
        nextAfter: null,
      };
    else if (path.endsWith("/transfers") && request.method() === "GET")
      data = {
        items: [
          {
            id: 41,
            occurredAt: "2026-11-03 10:00:00",
            actorId: 99,
            sourceId: 10,
            sourceName: "Origem",
            destinationId: 20,
            destinationName: "Destino",
          },
        ],
        hasMore: false,
        nextAfter: null,
      };
    else if (path.endsWith("/transfers")) {
      if (unknown) {
        await route.fulfill({
          status: 503,
          json: { outcome: "UNKNOWN", message: "Sem confirmação" },
        });
        return;
      }
      data = { operationId: body.operationId, status: "applied", transferId: 41 };
    } else throw new Error(`Unexpected API ${path}`);
    await route.fulfill({ json: { data } });
  });
  return { calls, state };
}
async function prepare(page: Page) {
  await page.getByRole("combobox", { name: "Operador de origem" }).click();
  await page.getByRole("option", { name: "Origem (#10)" }).click();
  await page.getByRole("combobox", { name: "Operador de destino" }).click();
  await page.getByRole("option", { name: "Destino (#20)" }).click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await page.getByRole("checkbox", { name: "Selecionar Cliente Alfa", exact: true }).check();
  await page.getByRole("button", { name: "Revisar 1 selecionados" }).click();
  await expect(page.getByRole("heading", { name: "Prévia · Transferência" })).toBeVisible();
}
test("desktop transfer reviews exact links and sends one command with captured credentials", async ({
  page,
}) => {
  const { calls } = await fixture(page);
  await page.goto(url);
  await prepare(page);
  await expect(page.getByText("Contadores de fidelização", { exact: false })).toBeVisible();
  await page.screenshot({
    path: "test-results-crm-administration/desktop-preview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Confirmar transferência" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Transferir clientes" }).dblclick();
  await expect(page.getByText(/Transferência #41 concluída/)).toBeVisible();
  const writes = calls.filter((call) => call.path.endsWith("/transfers"));
  expect(writes).toHaveLength(1);
  expect(writes[0].headers["authorization"]).toBe("Bearer token-a");
  expect(writes[0].headers["x-crm-instance"]).toBe("tenant-a");
  expect(writes[0].body).toMatchObject({
    customerIds: [1],
    source: 10,
    destination: 20,
    version: "a".repeat(64),
  });
  expect(writes[0].body.actorId).toBeUndefined();
});
test("mobile release and block previews expose policy limits without mutation controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { calls } = await fixture(page);
  await page.goto(url);
  await page.getByRole("tab", { name: "Desfidelização", exact: true }).click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await page.getByRole("checkbox", { name: "Selecionar Cliente Alfa", exact: true }).check();
  await page.getByRole("button", { name: "Revisar 1 selecionados" }).click();
  await expect(page.getByRole("button", { name: "Desfidelizar (indisponível)" })).toBeDisabled();
  await page.screenshot({
    path: "test-results-crm-administration/mobile-release.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("tab", { name: "Clientes a bloquear", exact: true }).click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await page.getByRole("checkbox", { name: "Selecionar Cliente Alfa", exact: true }).check();
  await page.getByRole("button", { name: "Prévia de reprovação", exact: true }).click();
  await page.getByRole("button", { name: "Revisar 1 selecionados" }).click();
  await expect(
    page.getByRole("button", { name: "Executar decisão (indisponível)" }),
  ).toBeDisabled();
  expect(
    calls.filter(
      (call) =>
        call.path.endsWith("/releases") ||
        call.path.endsWith("/approve") ||
        call.path.endsWith("/reject"),
    ),
  ).toHaveLength(0);
});
test("an unknown result survives reload and absent receipt never permits a new transfer", async ({
  page,
}) => {
  const { calls, state } = await fixture(page, true);
  await page.goto(url);
  await prepare(page);
  await page.getByRole("button", { name: "Confirmar transferência" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Transferir clientes" }).click();
  await expect(page.getByRole("button", { name: "Consultar comprovante" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Consultar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Consultar comprovante" }).click();
  await expect(page.getByText("Comprovante ainda não encontrado. Aguarde.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Consultar", exact: true })).toBeDisabled();
  state.confirmed = true;
  await page.getByRole("button", { name: "Consultar comprovante" }).click();
  await expect(page.getByText(/Transferência #41 confirmada/)).toBeVisible();
  expect(calls.filter((call) => call.path.endsWith("/transfers"))).toHaveLength(1);
});
test("changing tenant discards the old selection and common operators cannot access administration", async ({
  page,
}) => {
  const { calls } = await fixture(page);
  await page.goto(url);
  await prepare(page);
  await page.getByRole("button", { name: "Trocar tenant", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar transferência" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Operador de origem" })).toHaveValue("");
  await page.getByRole("button", { name: "Operador comum" }).click();
  await expect(page.getByText("Acesso restrito a administradores.")).toBeVisible();
  expect(calls.filter((call) => call.path.endsWith("/transfers"))).toHaveLength(0);
});
test("legacy documents can be consulted with client items and a clear current-catalog label", async ({
  page,
}) => {
  await fixture(page);
  await page.goto(url);
  await page.getByText("Consultar transferências registradas", { exact: true }).click();
  await page.getByRole("button", { name: "Consultar histórico", exact: true }).click();
  await expect(page.getByRole("table", { name: "Histórico de transferências" })).toContainText(
    "Origem (#10)",
  );
  await page.getByRole("button", { name: "Itens da transferência #41", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Itens da transferência", exact: true }),
  ).toContainText("Cliente Alfa (#1)");
  await expect(page.getByText(/Nomes e campanhas refletem o cadastro atual/)).toBeVisible();
});
