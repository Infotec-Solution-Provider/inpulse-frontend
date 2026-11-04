import { test, expect, type Page } from "@playwright/test";
type Request = { method: string; path: string; body: any; headers: Record<string, string> };
async function fixture(page: Page) {
  const calls: Request[] = [],
    jobs: any[] = [];
  let failCreate = false;
  const settings = {
    mode: "GENERAL",
    version: 1,
    accounts: [
      {
        id: "account",
        scope: "GENERAL",
        version: 1,
        fromEmail: "sender@example.test",
        fromName: "Empresa",
        host: "smtp.example.test",
        port: 587,
        username: "login",
        active: true,
      },
    ],
  };
  await page.route("http://email.fixture/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.replace("/api/marketing/email", "");
    const body = request.postDataJSON();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
      });
      return;
    }
    calls.push({ method: request.method(), path, body, headers: request.headers() });
    let data: any = {};
    let status = 200;
    if (path === "/settings") {
      if (request.method() === "PUT") {
        settings.mode = body.mode;
        settings.version++;
      }
      data = settings;
    } else if (path === "/account") {
      data = settings;
    } else if (path === "/preview")
      data = {
        ...body,
        to: [...new Set(body.to.map((v: string) => v.toLowerCase()))].filter(
          (v) => !body.excluded.includes(v),
        ),
        sender: { email: "sender@example.test", name: "Empresa", id: "account" },
        token: "preview-token",
        total: 1,
        html: body.html.replace(/<script>.*?<\/script>/g, ""),
        attachments: body.attachments.map((a: any) => ({ name: a.name, bytes: 1 })),
      };
    else if (path === "/jobs" && request.method() === "POST") {
      if (failCreate) {
        failCreate = false;
        status = 503;
        data = { message: "Falha de confirmação; repita com a mesma chave." };
      } else {
        data = {
          id: "job1",
          name: body.content.name,
          kind: body.content.kind,
          state: body.content.kind === "CAMPAIGN" ? "DRAFT" : "RUNNING",
          version: 1,
          fromEmail: "sender@example.test",
          deliveries: [
            {
              id: "d1",
              recipient: "one@example.test",
              state: "PENDING",
              attempt: 0,
              errorCode: null,
            },
          ],
        };
        jobs.push(data);
      }
    } else if (path === "/jobs") data = { data: jobs };
    else if (path.endsWith("/actions")) {
      jobs[0].state = body.action === "START" ? "RUNNING" : "PAUSED";
      jobs[0].version++;
      data = jobs[0];
    } else if (path.startsWith("/jobs/")) data = jobs[0];
    else if (path === "/importer")
      data = {
        supported: true,
        writable: false,
        maxLength: 150,
        reason: "Inclusão e edição exigem índice único completo em EMAIL.",
        data: [{ CODIGO: 1, EMAIL: "import@example.test", ATIVO: "S" }],
        page: 1,
        hasNext: false,
      };
    else {
      status = 404;
      data = { message: "Fixture desconhecida" };
    }
    await route.fulfill({
      status,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  });
  return {
    calls,
    jobs,
    failNextCreate: () => {
      failCreate = true;
    },
  };
}
async function compose(page: Page) {
  await page.getByLabel("Para (separe").fill("one@example.test");
  await page.getByLabel("Assunto", { exact: true }).fill("Olá");
  await page
    .getByLabel("Texto formatado (HTML)", { exact: true })
    .fill("<p>Mensagem <strong>formatada</strong></p>");
}

test("email section links open the requested screen without submitting anything", async ({
  page,
}) => {
  const f = await fixture(page);
  for (const [query, label] of [
    ["", "Enviar"],
    ["?tab=tracking", "Acompanhar"],
    ["?tab=accounts", "Contas"],
    ["?tab=importer", "Importador"],
    ["?tab=invalid", "Enviar"],
  ]) {
    await page.goto(`/tests/crm-email/index.html${query}`);
    await expect(page.getByRole("tab", { name: label, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText("Remetente: Empresa", { exact: false })).toBeVisible();
    if (label === "Enviar") await expect(page.getByLabel("Assunto", { exact: true })).toBeVisible();
    if (label === "Acompanhar")
      await expect(
        page.getByRole("button", { name: "Atualizar acompanhamento", exact: true }),
      ).toBeVisible();
    if (label === "Contas")
      await expect(page.getByLabel("Email remetente", { exact: true })).toBeVisible();
    if (label === "Importador")
      await expect(page.getByText("import@example.test", { exact: false })).toBeVisible();
  }
  expect(f.calls.filter((call) => call.method !== "GET")).toHaveLength(0);
});
test("individual preview shows sender/CC/BCC/attachment, pins session and queues exactly once", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await page.goto("/tests/crm-email/index.html");
  await compose(page);
  await page.getByLabel("CC", { exact: true }).fill("copy@example.test");
  await page.getByLabel("CCO", { exact: true }).fill("blind@example.test");
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("a") });
  await expect(page.getByText("a.txt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Revisar prévia", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Empresa <sender@example.test>");
  await expect(page.getByRole("dialog")).toContainText("CCO: blind@example.test");
  await expect(page.frameLocator("iframe").getByText("Mensagem formatada")).toBeVisible();
  await expect(page.locator(".MuiDialog-container")).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: info.outputPath("desktop-preview.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Confirmar envio", exact: true }).click();
  await expect(page.getByText("Envio colocado na fila", { exact: false })).toBeVisible();
  expect(f.calls.filter((c) => c.path === "/jobs" && c.method === "POST")).toHaveLength(1);
  for (const c of f.calls) {
    expect(c.headers.authorization).toBe("Bearer test-token");
    expect(c.headers["x-crm-instance"]).toBe("tenant-a");
  }
});
test("uncertain confirmation preserves idempotency key and preview for a deliberate retry", async ({
  page,
}) => {
  const f = await fixture(page);
  f.failNextCreate();
  await page.goto("/tests/crm-email/index.html");
  await compose(page);
  await page.getByRole("button", { name: "Revisar prévia", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar envio", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Falha de confirmação");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar envio", exact: true }).click();
  await expect(page.getByText("Envio colocado na fila", { exact: false })).toBeVisible();
  const posts = f.calls.filter((c) => c.path === "/jobs" && c.method === "POST");
  expect(posts).toHaveLength(2);
  expect(posts[0].body.requestKey).toBe(posts[1].body.requestKey);
});
test("campaign review creates draft, starts with version and test preview isolates recipient", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/tests/crm-email/index.html");
  await page.getByLabel("Tipo de envio").click();
  await page.getByRole("option", { name: "Campanha", exact: true }).click();
  await compose(page);
  await page.getByLabel("Nome da campanha").fill("Campanha A");
  await page.getByLabel("Endereço para envio de teste").fill("test@example.test");
  await page.getByRole("button", { name: "Revisar envio de teste" }).click();
  expect(f.calls.find((c) => c.path === "/preview")!.body.to).toEqual(["test@example.test"]);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Revisar prévia", exact: true }).click();
  await page.getByRole("button", { name: "Salvar campanha revisada" }).click();
  await page.getByRole("button", { name: "Ver destinatários e ações" }).click();
  await page.getByRole("button", { name: "Iniciar campanha" }).click();
  expect(f.calls.find((c) => c.path.endsWith("/actions"))!.body).toEqual({
    action: "START",
    expectedVersion: 1,
  });
});
test("mobile account choice is explicit and legacy importer is read only without safe capability", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.goto("/tests/crm-email/index.html");
  await page.getByRole("tab", { name: "Contas", exact: true }).click();
  await expect(page.getByText("Como a empresa enviará emails?")).toBeVisible();
  await page.getByRole("tab", { name: "Importador", exact: true }).click();
  await expect(page.getByText("import@example.test", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar endereço" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: info.outputPath("mobile-importer.png"),
    fullPage: true,
    animations: "disabled",
  });
});
test("operator cannot access company configuration or campaigns", async ({ page }) => {
  await fixture(page);
  await page.goto("/tests/crm-email/index.html?operator&tab=importer");
  await expect(page.getByRole("tab", { name: "Enviar", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Tipo de envio")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Importador", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Contas", exact: true }).click();
  await expect(page.getByLabel("Modo de contas")).toHaveCount(0);
  await expect(page.getByLabel("Conta a configurar")).toHaveCount(0);
  await expect(page.getByLabel("Email remetente", { exact: true })).toBeVisible();
});
