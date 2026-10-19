import { expect, test, type Page } from "@playwright/test";

test("catálogo respeita Retry-After mesmo ao fechar e reabrir a subvisão", async ({ page }) => {
  await setup(page);
  const times: number[] = [];
  await page.route("**/api/whatsapp/monitor/channels?*", async (route) => {
    times.push(Date.now());
    if (times.length === 1)
      await route.fulfill({
        status: 429,
        headers: { "Retry-After": "2" },
        json: { code: "READ_REQUEST_LIMIT", retryAfterSeconds: 2 },
      });
    else
      await route.fulfill({ json: { data: { items: [], totalCount: 0, page: 1, pageSize: 20 } } });
  });
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("button", { name: /^Canal da última mensagem:/ }).click();
  await expect(page.getByRole("alert")).toContainText("Aguarde 2 segundos");
  await page.getByRole("button", { name: "Voltar aos filtros" }).click();
  await page.getByRole("button", { name: /^Canal da última mensagem:/ }).click();
  await expect(page.getByText("Nenhum canal encontrado.", { exact: true })).toBeVisible();
  expect(times).toHaveLength(2);
  expect(times[1] - times[0]).toBeGreaterThanOrEqual(1900);
});

async function setup(page: Page) {
  const searches: { filters: { lastMessageChannelId: number | "all"; searchText: string } }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/whatsapp/monitor/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/channels")) {
      const current = Number(url.searchParams.get("page") || 1);
      const names = Array.from({ length: 21 }, (_, index) => ({
        id: index + 1,
        name: index === 20 ? "Comercial histórico" : `Canal ${index + 1}`,
        phone: "+55 (11) 0000-0000",
        isActive: index !== 20,
      }));
      const options = names.filter((item) =>
        `${item.name} ${item.phone}`.includes(url.searchParams.get("search") || ""),
      );
      await route.fulfill({
        json: {
          data: {
            items: options.slice((current - 1) * 20, current * 20),
            totalCount: options.length,
            page: current,
            pageSize: 20,
          },
        },
      });
      return;
    }
    const body = route.request().postDataJSON();
    const filtered = body.filters.lastMessageChannelId === 21;
    if (url.pathname.endsWith("/summary")) {
      await route.fulfill({
        json: {
          data: {
            inProgress: filtered ? 1 : 2,
            waitingAgent: filtered ? 1 : 2,
            waitingCustomer: 0,
            unread: 0,
            overdue: 0,
            scheduled: 0,
            slaMinutes: 30,
          },
        },
      });
      return;
    }
    searches.push(body);
    const items = [1, 21]
      .filter(
        (id) =>
          body.filters.lastMessageChannelId === "all" || body.filters.lastMessageChannelId === id,
      )
      .map((id) => ({
        id,
        instance: "tenant-a",
        chatType: "wpp",
        userId: 2,
        sectorId: 1,
        isFinished: false,
        startedAt: new Date().toISOString(),
        contact: { id, name: `Cliente ${id}`, phone: "5511000000000" },
        operational: {
          status: "waiting_agent",
          lastMessageAt: new Date().toISOString(),
          lastMessagePreview: "Mensagem fictícia",
          waitingSince: new Date().toISOString(),
          unreadCount: 0,
          channel: "WABA",
          lastMessageChannel: {
            id,
            name: id === 21 ? "Comercial histórico" : "Canal 1",
            phone: "+55 (11) 0000-0000",
          },
          deliveryStatus: null,
          slaBreached: false,
        },
      }));
    await route.fulfill({
      json: { data: { items, totalCount: items.length, page: 1, pageSize: 20 } },
    });
  });
  await page.goto("/tests/monitor/index.html");
  await expect(page.getByRole("article")).toHaveCount(2);
  return { searches, errors };
}

test("canal específico mantém seleção entre páginas e aplica, cancela e remove sem aplicar outros rascunhos", async ({
  page,
}) => {
  const { searches, errors } = await setup(page);
  await expect(
    page
      .getByRole("article")
      .last()
      .getByText("Canal: Comercial histórico · +55 (11) 0000-0000", { exact: true }),
  ).toBeVisible();
  const before = searches.length;
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("button", { name: /^Canal da última mensagem:/ }).click();
  await page.getByRole("button", { name: "Próxima página de canais" }).click();
  await page.getByRole("radio", { name: /Comercial histórico/ }).check();
  await page.getByRole("button", { name: "Página anterior de canais" }).click();
  await expect(
    page.getByRole("radio", { name: /Comercial histórico.*seleção mantida/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Usar canal" }).click();
  await expect(page.getByRole("button", { name: /^Canal da última mensagem:/ })).toBeFocused();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(searches).toHaveLength(before);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("button", { name: /^Canal da última mensagem: Todos/ }).click();
  await page
    .getByRole("textbox", { name: "Buscar canal por nome ou número" })
    .fill("Comercial histórico");
  await page.getByRole("button", { name: "Buscar canais", exact: true }).click();
  await page.getByRole("radio", { name: /Comercial histórico/ }).check();
  await page.getByRole("button", { name: "Usar canal" }).click();
  expect(searches).toHaveLength(before);
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(searches.at(-1)?.filters.lastMessageChannelId).toBe(21);
  await expect(page.getByRole("button", { name: "Em atendimento 1", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Pesquisar", exact: true }).fill("Rascunho sem aplicar");
  await page.getByRole("button", { name: /^Filtro aplicado Canal:/ }).press("Delete");
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(searches.at(-1)?.filters).toMatchObject({ lastMessageChannelId: "all", searchText: "" });
  await expect(page.getByRole("textbox", { name: "Pesquisar", exact: true })).toHaveValue(
    "Rascunho sem aplicar",
  );
  expect(errors).toEqual([]);
});

test("mobile mostra o canal sem etiqueta e mantém rodapé do seletor acessível", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const { errors } = await setup(page);
  await expect(
    page
      .getByRole("article")
      .first()
      .getByText(/^Canal: Canal 1/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("button", { name: /^Canal da última mensagem:/ }).click();
  await expect(page.getByRole("button", { name: "Usar canal" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Voltar aos filtros" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Voltar aos filtros" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(errors).toEqual([]);
});
