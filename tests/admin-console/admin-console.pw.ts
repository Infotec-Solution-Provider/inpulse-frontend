import { expect, test } from "@playwright/test";

const chooseConfiguration = async (page: import("@playwright/test").Page, name: string) => {
  await page.getByRole("textbox", { name: "Encontrar configuração", exact: true }).fill(name);
  await page.getByRole("button", { name, exact: true }).click();
};

test.beforeEach(async ({ request, page }) => {
  await request.post("/__fixture/reset", { data: {} });
  if (process.env.ADMIN_REAL_API === "1") {
    const bootstrap = await page.request.post("/infotec/admin/api/session", {
      headers: {
        origin: "http://127.0.0.1:4194",
        authorization: "Bearer fixture-admin",
        "Content-Type": "application/json",
      },
      data: {},
    });
    expect(bootstrap.status()).toBe(200);
  }
  await page.goto("/infotec/admin/");
  await expect(page.getByRole("heading", { name: "Parâmetros dos tenants" })).toBeVisible();
  await page.getByRole("combobox", { name: "Tenant de destino", exact: true }).fill("Infotec");
  await page.getByRole("option", { name: "Infotec (infotec)", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }),
  ).toBeVisible();
});

test("loads independent assets and allows all four areas without Next", async ({
  page,
  request,
}) => {
  await page.screenshot({ path: "test-results/admin-console-desktop.png", fullPage: true });
  expect((await request.get("/infotec")).status()).toBe(404);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((item) => item.name)
        .filter((name) => /\.(js|css|woff2)/.test(name))
        .every((name) => new URL(name).pathname.startsWith("/infotec/admin/")),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Servidor", exact: true }).click();
  await expect(page.getByText("homolog-users-service", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Logs", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Logs", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Processo", exact: true }).click();
  await page.getByRole("option", { name: "homolog-users-service" }).click();
  await page.getByRole("button", { name: "Consultar logs" }).click();
  await expect(page.locator("pre")).toContainText("<script>alert('x')</script>");
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Histórico de alterações" })).toBeVisible();
});

test("requires an explicit target and remembers only selected IDs across areas", async ({
  page,
}) => {
  await page.evaluate(() => sessionStorage.clear());
  const reads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/settings/")) reads.push(request.url());
  });
  await page.reload();
  await expect(page.getByText("Escolha uma empresa para começar", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "WhatsApp e atendimento", exact: true }),
  ).toBeDisabled();
  expect(reads).toHaveLength(0);
  const tenant = page.getByRole("combobox", { name: "Tenant de destino", exact: true });
  await tenant.fill("Cliente");
  await page.getByRole("option", { name: "Cliente (cliente)", exact: true }).click();
  await chooseConfiguration(page, "Agente padrão");
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue(
    "cliente · Empresa",
  );
  await page.getByRole("button", { name: "Servidor", exact: true }).click();
  await page.getByRole("button", { name: "Tenants", exact: true }).click();
  await expect(tenant).toHaveValue("Cliente (cliente)");
  await expect(page.getByRole("button", { name: "Agente padrão", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.getByText("Ambiente: Homologação", { exact: true })).toBeVisible();
  const stored = await page.evaluate(() =>
    Object.entries(sessionStorage).filter(([key]) => key.startsWith("inpulse-admin-selection:")),
  );
  expect(stored).toHaveLength(1);
  expect(JSON.parse(stored[0][1])).toEqual({ tenant: "cliente", source: "ai-agent" });
});

test("keeps a draft when a source change is cancelled and supports source search", async ({
  page,
}) => {
  await page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }).check();
  const search = page.getByRole("textbox", { name: "Encontrar configuração", exact: true });
  await search.fill("OPENAI");
  await expect(page.getByRole("button", { name: "Credencial OpenAI", exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Credencial OpenAI", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }),
  ).toBeChecked();
  await expect(search).toHaveValue("OPENAI");
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await search.fill("integracoes");
  await expect(page.getByRole("button", { name: "Armazenamento", exact: true })).toBeVisible();
  await search.fill("ai-agent");
  await expect(page.getByRole("button", { name: "Agente padrão", exact: true })).toBeVisible();
});

test("distinguishes unavailable, empty, editable and apply-only sources", async ({ page }) => {
  const sources = [
    { id: "whatsapp", label: "WhatsApp", category: "Atendimento", available: true },
    { id: "ai", label: "Recursos de IA", category: "IA", available: true },
    { id: "tenant", label: "Parâmetros do tenant", category: "Tenant", available: true },
    { id: "storage", label: "Armazenamento", category: "Integrações", available: true },
    { id: "crm", label: "CRM", category: "CRM", available: true },
    { id: "ami", label: "Conexão AMI", category: "Telefonia", available: true, applyOnly: true },
  ];
  await page.route("**/sources", (route) => route.fulfill({ json: { sources } }));
  await page.route("**/targets/whatsapp*", (route) =>
    route.fulfill({
      json: {
        targets: [],
        hasMore: false,
        unavailableReason: "Não há setores ou usuários disponíveis: runtime ausente.",
      },
    }),
  );
  await page.route("**/tenants/infotec/settings/*", (route) => {
    const source = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (source === "crm")
      return route.fulfill({
        status: 503,
        json: { message: "Fonte indisponível. Verifique a conexão CRM." },
      });
    const unavailable = ["whatsapp", "storage"].includes(source);
    return route.fulfill({
      json: {
        source,
        tenant: "infotec",
        revision: "r1",
        target: { scope: "INSTANCE" },
        catalog: ["tenant", "ami"].includes(source)
          ? []
          : [
              {
                key: "feature",
                label: "Recurso da fonte",
                description: "Recurso configurável",
                category: "Recursos",
                type: "boolean",
                readOnly: unavailable,
                applyMode: source === "ai" ? "dynamic" : "reload",
              },
            ],
        values: { feature: true },
        resources: [],
        unavailableReason: unavailable
          ? "Esta fonte não está preparada para este tenant."
          : undefined,
        application: { state: "pending", revision: "r1" },
      },
    });
  });
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "não está preparada" })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Recurso da fonte", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Aplicar versão salva", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("Aplicação pendente", { exact: false })).toHaveCount(0);
  await page.getByRole("combobox", { name: /^Escopo/ }).click();
  await page.getByRole("option", { name: "Setor", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "runtime ausente" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Setor", exact: true })).toBeDisabled();
  await chooseConfiguration(page, "Parâmetros do tenant");
  await expect(
    page.getByText("Nenhum parâmetro cadastrado ou classificado nesta fonte.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Selecione um registro acima", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aplicar versão salva", exact: true })).toHaveCount(
    0,
  );
  await chooseConfiguration(page, "Armazenamento");
  await expect(page.getByRole("alert").filter({ hasText: "não está preparada" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Armazenamento", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aplicar versão salva", exact: true })).toHaveCount(
    0,
  );
  await chooseConfiguration(page, "CRM");
  await expect(page.getByRole("alert").filter({ hasText: "Fonte indisponível" })).toContainText(
    "Infotec (infotec) · CRM",
  );
  await chooseConfiguration(page, "Recursos de IA");
  await expect(page.getByRole("checkbox", { name: "Recurso da fonte", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Aplicar versão salva", exact: true })).toHaveCount(
    0,
  );
  await chooseConfiguration(page, "Conexão AMI");
  await expect(
    page.getByRole("button", { name: "Aplicar versão salva", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Aplicar versão salva", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Homologação · Infotec (infotec) · Conexão AMI",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.screenshot({
    path: "test-results/admin-navigation-empty-and-apply.png",
    fullPage: true,
  });
});

test("keeps navigation usable on mobile and both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Alternar tema", exact: true }).click();
    await chooseConfiguration(page, "Credencial OpenAI");
    await expect(
      page.getByRole("button", { name: "Credencial OpenAI", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      page.getByRole("textbox", { name: "Chave do provedor", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/admin-navigation-mobile-${theme}.png`,
      fullPage: true,
    });
  }
});

test("searches keys, saves typed changes and clears write-only secrets", async ({
  page,
  request,
}) => {
  const secret = page.getByRole("textbox", { name: "Chave do provedor", exact: true });
  await expect(secret).toHaveValue("");
  await secret.fill("fixture-new-secret");
  await page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }).check();
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText("fixture-new-secret");
  await page.getByRole("button", { name: "Confirmar salvamento" }).click();
  await expect(page.getByRole("status")).toContainText("Nenhuma alteração pendente");
  await expect(secret).toHaveValue("");
  expect(
    await page.evaluate(() =>
      JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
    ),
  ).not.toContain("fixture-new-secret");
  const calls = (await (await request.get("/__fixture/state")).json()).calls;
  expect(calls).toHaveLength(1);
  expect(calls[0].body.changes).toEqual([
    { key: "feature_ai_enabled", action: "set", value: true },
    { key: "api_key", action: "set", value: "fixture-new-secret" },
  ]);
  await page.getByRole("button", { name: "Aplicar versão salva" }).click();
  await page.getByRole("button", { name: "Confirmar aplicação" }).click();
  await expect(page.getByText("Operação confirmada.", { exact: false })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar parâmetro, chave ou descrição" })
    .fill("feature_ai_enabled");
  await expect(
    page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }),
  ).toBeChecked();
  await expect(page.getByTestId("setting-timeout")).toHaveCount(0);
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(page.locator("tbody")).not.toContainText("[object Object]");
  await page
    .getByRole("row")
    .filter({ hasText: "2 campo(s)" })
    .getByRole("button", { name: "Ver detalhes" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Credencial substituída");
  await expect(page.getByRole("dialog")).not.toContainText("fixture-new-secret");
});

test("retains drafts on revision conflict and requires refresh before resaving", async ({
  page,
  request,
}) => {
  const number = page.getByRole("spinbutton", { name: "Tempo de espera", exact: true });
  await number.fill("4");
  await request.post("/__fixture/advance", { data: {} });
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar salvamento" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "A configuração mudou" })).toBeVisible();
  await expect(number).toHaveValue("4");
  await expect(page.getByRole("button", { name: "Salvar alterações", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await page.getByRole("button", { name: "Recarregar", exact: true }).click();
  await expect(number).toHaveValue("2");
});

test("reconciles an uncertain save without replaying the mutation", async ({ page, request }) => {
  await request.post("/__fixture/uncertain", { data: {} });
  await page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }).check();
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar salvamento" }).click();
  await expect(page.getByText("Resultado a conferir", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar alterações", exact: true })).toBeDisabled();
  if (process.env.ADMIN_REAL_API === "1") await request.post("/__fixture/reconcile", { data: {} });
  await page.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Nenhuma alteração pendente");
  expect((await (await request.get("/__fixture/state")).json()).calls).toHaveLength(1);
});

test("confirms a process stop and retains the console for recovery", async ({ page }) => {
  await page.getByRole("button", { name: "Servidor", exact: true }).click();
  await page.getByRole("button", { name: "Parar homolog-users-service", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Homologação · homolog-users-service");
  await page.getByRole("button", { name: "Confirmar ação" }).click();
  await expect(page.getByText("stopped", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar homolog-users-service", exact: true }),
  ).toBeEnabled();
});

test("preserves a dirty tenant target when navigation is cancelled and fits mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }).check();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Servidor", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Parâmetros dos tenants" })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }),
  ).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/admin-console-mobile.png", fullPage: true });
});

test("denies an expired session before any editable settings load", async ({ page, request }) => {
  await request.post("/__fixture/reset", { data: { anonymous: true } });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Acesso administrativo" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("cancels an old tenant read when the target changes", async ({ page }) => {
  await page.route("**/tenants/cliente/settings/whatsapp*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue().catch(() => {});
  });
  const tenant = page.getByRole("combobox", { name: "Tenant de destino", exact: true });
  await tenant.fill("Cliente");
  await page.getByRole("option", { name: "Cliente (cliente)", exact: true }).click();
  await expect(page.getByLabel("Carregando parâmetros", { exact: true })).toBeVisible();
  await tenant.fill("Infotec");
  await page.getByRole("option", { name: "Infotec (infotec)", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue(
    "infotec · Empresa",
  );
  await expect(
    page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }),
  ).toBeVisible();
});

test("keeps the current session when renewal is temporarily unavailable", async ({ page }) => {
  await page.route("**/session/renew", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"message":"Users indisponível"}',
    }),
  );
  await page.getByRole("button", { name: "Renovar sessão", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível renovar" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parâmetros dos tenants" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue(
    "infotec · Empresa",
  );
});

test("loads tenant-wide AI and discovers resource selectors from snapshots", async ({ page }) => {
  const source = page.getByRole("textbox", { name: "Encontrar configuração", exact: true });
  await source.fill("Agente padrão");
  await page.getByRole("button", { name: "Agente padrão", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue(
    "infotec · Empresa",
  );
  await expect(page.getByRole("combobox", { name: "Registro", exact: true })).toHaveCount(0);
  for (const label of ["Canais e provedores", "Armazenamento"]) {
    await source.fill(label);
    await page.getByRole("button", { name: label, exact: true }).click();
    const resource = page.getByRole("combobox", {
      name: label === "Armazenamento" ? "Armazenamento" : "Canal",
      exact: true,
    });
    await expect(resource).toBeVisible();
    await resource.click();
    await page.getByRole("option", { name: "Recurso comercial", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue(
      "infotec · Empresa",
    );
  }
});

test("acknowledges a permanently unknown operation locally without replay or backend status changes", async ({
  page,
  request,
}) => {
  await request.post("/__fixture/permanent", { data: {} });
  await page
    .getByRole("textbox", { name: "Chave do provedor", exact: true })
    .fill("discard-this-secret");
  await page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }).check();
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar salvamento" }).click();
  await expect(page.getByText("Resultado a conferir", { exact: false })).toBeVisible();
  const first = (await (await request.get("/__fixture/state")).json()).calls[0];
  const originalId = first.body.operationId;
  await page.getByRole("button", { name: "Encerrar acompanhamento", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("continua indeterminado no histórico");
  await expect(dialog).not.toContainText("discard-this-secret");
  await dialog.getByRole("button", { name: "Encerrar acompanhamento", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Chave do provedor", exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByRole("status")).toContainText("Nenhuma alteração pendente");
  expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage }))).not.toContain(
    originalId,
  );
  await page.screenshot({ path: "test-results/admin-console-unknown-ack.png", fullPage: true });
  const tenant = page.getByRole("combobox", { name: "Tenant de destino", exact: true });
  await tenant.fill("Cliente");
  await page.getByRole("option", { name: "Cliente (cliente)", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue(
    "cliente · Empresa",
  );
  await page.getByRole("spinbutton", { name: "Tempo de espera", exact: true }).fill("3");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar salvamento" }).click();
  await expect(page.getByRole("status")).toContainText("Nenhuma alteração pendente");
  const calls = (await (await request.get("/__fixture/state")).json()).calls;
  expect(calls).toHaveLength(2);
  expect(calls[1].body.operationId).not.toBe(originalId);
  expect(calls[1].body.revision).not.toBe(first.body.revision);
  expect(calls[1].body.changes).toEqual([{ key: "timeout", action: "set", value: 3 }]);
  const original = await (
    await page.request.get(`/infotec/admin/api/operations/${originalId}`)
  ).json();
  expect(original.state).toBe("UNKNOWN");
  await page.getByRole("button", { name: "Servidor", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Servidor", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo", exact: true }),
  ).toBeVisible();
});
