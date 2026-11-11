import { expect, test } from "@playwright/test";

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
  const source = page.getByRole("combobox", { name: /^Configurações/ });
  await source.click();
  await page.getByRole("option", { name: "Agente padrão", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue(
    "infotec · Empresa",
  );
  await expect(page.getByRole("combobox", { name: "Registro", exact: true })).toHaveCount(0);
  for (const label of ["Canais e provedores", "Armazenamento"]) {
    await source.click();
    await page.getByRole("option", { name: label, exact: true }).click();
    const resource = page.getByRole("combobox", { name: "Registro", exact: true });
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
