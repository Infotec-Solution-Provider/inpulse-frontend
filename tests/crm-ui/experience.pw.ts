import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
declare global {
  interface Window {
    crmUiTest: {
      navigate: (path: string) => void;
      switchTenant: (tenant: string) => void;
      switchActor: (actor: number) => void;
      setRole: (role: string) => void;
    };
  }
}
async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/crm-ui/index.html");
  await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Cliente demonstrativo 01");
}
test("customer filter drafts apply explicitly and cancellation leaves the query unchanged", async ({
  page,
}) => {
  const queries: URL[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/customers") queries.push(url);
  });
  await open(page);
  const before = queries.length;
  await page.getByRole("button", { name: "Filtros de clientes", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Cidade", { exact: true }).fill("Canoas");
  expect(queries.length).toBe(before);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(queries.length).toBe(before);
  await page.getByRole("button", { name: "Filtros de clientes", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Cidade", { exact: true })).toHaveValue("");
  await page.getByRole("dialog").getByLabel("Cidade", { exact: true }).fill("Canoas");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.searchParams.get("CIDADE")).toBe("Canoas");
  await expect(page.getByRole("table")).not.toContainText("Cliente demonstrativo 02");
  expect(await page.evaluate(() => location.search)).toBe("");
});
test("customer query and pagination survive visiting related catalogs", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Go to next page" }).click();
  await expect(page.getByRole("table")).toContainText("Cliente demonstrativo 11");
  if (
    (await page
      .getByRole("button", { name: "Clientes", exact: true })
      .getAttribute("aria-expanded")) !== "true"
  )
    await page.getByRole("button", { name: "Clientes", exact: true }).click();
  await page
    .locator("#navigation-customers")
    .getByRole("link", { name: "Segmentos", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Segmentos", exact: true })).toBeVisible();
  await page
    .locator("#navigation-customers")
    .getByRole("link", { name: "Cadastro", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("Cliente demonstrativo 11");
  await expect(page.getByRole("button", { name: "Novo cliente", exact: true })).toHaveCount(1);
});
test("customer old responses and filters do not cross a tenant switch", async ({ page }) => {
  await open(page);
  let release: (() => void) | undefined;
  await page.route("**/api/customers?**", async (route) => {
    if (!new URL(route.request().url()).searchParams.get("RAZAO")) return route.continue();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        json: { data: [{ CODIGO: 999, RAZAO: "Resposta antiga" }], page: { totalRows: 1 } },
      })
      .catch(() => {});
  });
  await page.getByLabel("Buscar cliente por nome", { exact: true }).fill("lenta");
  await page.getByRole("button", { name: "Buscar clientes", exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.evaluate(() => window.crmUiTest.switchTenant("tenant-b"));
  await expect(page.getByRole("table")).toContainText("Cliente demonstrativo 01");
  release!();
  await expect(page.getByRole("table")).not.toContainText("Resposta antiga");
  await expect(page.getByLabel("Buscar cliente por nome", { exact: true })).toHaveValue("");
});
test("real customer rows reflow in six dimensions with no page overflow", async ({ page }) => {
  await open(page);
  const folder = resolve(
    "C:/Workspace/infotec/planejamento/cross-service/INF-20261019-004-crm-ui-navigation/artifacts",
  );
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [390, 844],
    [320, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole("button", { name: "Novo cliente", exact: true })).toBeVisible();
    await page.screenshot({ path: `${folder}/customers-light-${width}x${height}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Preferência de tema", exact: true }).click();
  await page.getByRole("menuitem", { name: "Escuro", exact: true }).click();
  await expect(page.locator('[data-ui-theme="dark"]')).not.toHaveCount(0);
  await expect(page.getByRole("menu")).toHaveCount(0);
  const selected = page
    .getByRole("navigation", { name: "Navegação principal" })
    .locator('[aria-current="page"]');
  await expect(selected).toHaveCSS("background-color", "rgb(48, 32, 68)");
  await page.screenshot({ path: `${folder}/customers-dark-1440x900.png` });
});

test("full customer draft requires confirmation before leaving through the menu", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page.getByLabel("Nome fantasia", { exact: true }).fill("Rascunho demonstrativo");
  if (
    (await page
      .getByRole("button", { name: "Clientes", exact: true })
      .getAttribute("aria-expanded")) !== "true"
  )
    await page.getByRole("button", { name: "Clientes", exact: true }).click();
  await page
    .locator("#navigation-customers")
    .getByRole("link", { name: "Segmentos", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: /Descartar altera/ })).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
  await expect(page.getByLabel("Nome fantasia", { exact: true })).toHaveValue(
    "Rascunho demonstrativo",
  );
  await page
    .locator("#navigation-customers")
    .getByRole("link", { name: "Segmentos", exact: true })
    .click();
  await page.getByRole("button", { name: "Descartar e sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Segmentos", exact: true })).toBeVisible();
});

test("users list query survives a visit to expedients and resets for another actor", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/users"));
  await expect(page.getByRole("table")).toContainText("Maria");
  await page.getByRole("button", { name: "Go to next page" }).click();
  await expect(page.getByRole("table")).toContainText("Usuário demonstrativo 10");
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/user-catalogs/shifts"));
  await expect(page.getByRole("heading", { name: "Expedientes", exact: true })).toBeVisible();
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/users"));
  await expect(page.getByRole("table")).toContainText("Usuário demonstrativo 10");
  await page.evaluate(() => window.crmUiTest.switchActor(2));
  await expect(page.getByRole("table")).toContainText("Maria");
});

test("users, grouped expedients and full registration fit desktop and narrow screens", async ({
  page,
}) => {
  await open(page);
  const folder = resolve(
    "C:/Workspace/infotec/planejamento/cross-service/INF-20261019-004-crm-ui-navigation/artifacts",
  );
  for (const width of [1440, 1280, 1024, 390, 320, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    for (const route of ["users", "user-catalogs/shifts", "crm-customers/new"]) {
      await page.evaluate((route) => window.crmUiTest.navigate(`/tenant-a/${route}`), route);
      await expect(page.locator("h1")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if ([1440, 320].includes(width))
        await page.screenshot({
          path: `${folder}/wave2-${route.replaceAll("/", "-")}-${width}.png`,
        });
    }
  }
});

test("campaign sections preserve drafts and exception tabs track their menu destination", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/crm-campaigns/10/configure"));
  await page.getByRole("tab", { name: "Geração", exact: true }).click();
  await page.getByLabel("Data e hora no CRM", { exact: true }).fill("2026-10-20T09:30");
  await page.getByRole("tab", { name: "Público", exact: true }).click();
  await page.getByLabel("Situação dos clientes", { exact: true }).click();
  await page.getByRole("option", { name: "Inativos", exact: true }).click();
  await page.getByRole("tab", { name: "Usuários", exact: true }).click();
  await page.getByLabel("Código do vínculo", { exact: true }).fill("88");
  await page.getByRole("tab", { name: "Público", exact: true }).click();
  await expect(page.getByRole("combobox", { name: /Situação dos clientes/ })).toHaveText(
    "Inativos",
  );
  await page.getByRole("tab", { name: "Usuários", exact: true }).click();
  await expect(page.getByLabel("Código do vínculo", { exact: true })).toHaveValue("88");
  await page.getByRole("tab", { name: "Geração", exact: true }).click();
  await expect(page.getByLabel("Data e hora no CRM", { exact: true })).toHaveValue(
    "2026-10-20T09:30",
  );
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/crm-exceptions?kind=states"));
  await expect(page.getByRole("tab", { name: "Estados", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator('[aria-current="page"]')).toHaveText("Estados");
  await page.getByRole("tab", { name: "Clientes", exact: true }).click();
  await expect(page.locator('[aria-current="page"]')).toHaveText("Clientes");
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/crm-exceptions?kind=invalid"));
  await expect(page.getByRole("tab", { name: "Cidades", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("campaigns, results, exceptions, ordering and purchases fit six sizes and both themes", async ({
  page,
}) => {
  await open(page);
  const folder = resolve(
    "C:/Workspace/infotec/planejamento/cross-service/INF-20261019-004-crm-ui-navigation/artifacts",
  );
  for (const dark of [false, true]) {
    if (dark) {
      await page.getByRole("button", { name: "Preferência de tema", exact: true }).click();
      await page.getByRole("menuitem", { name: "Escuro", exact: true }).click();
    }
    for (const width of [1440, 1280, 1024, 390, 320, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
      for (const route of [
        "crm-campaigns",
        "crm-results",
        "crm-exceptions",
        "crm-ordering",
        "crm-purchases",
        "crm-campaigns/10/configure",
      ]) {
        await page.evaluate((route) => window.crmUiTest.navigate(`/tenant-a/${route}`), route);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.getByRole("progressbar")).toHaveCount(0);
        if (route === "crm-campaigns")
          await expect(
            page.getByRole("button", { name: "Nova campanha", exact: true }),
          ).toBeEnabled();
        if (route === "crm-purchases")
          await expect(
            page.getByRole("button", { name: "Novo lançamento", exact: true }),
          ).toBeEnabled();
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true);
        if ([1440, 320].includes(width))
          await page.screenshot({
            path: `${folder}/wave3-${route.replaceAll("/", "-")}-${width}-${dark ? "dark" : "light"}.png`,
          });
      }
    }
  }
});

test("the discard confirmation works over the compact menu and mobile drawer", async ({ page }) => {
  await open(page);
  for (const mobile of [false, true]) {
    await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/crm-customers/new"));
    await page.getByLabel("Nome fantasia", { exact: true }).fill("Menu draft");
    if (mobile) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Recolher navegação", exact: true }).click();
      await page.getByRole("button", { name: "Clientes", exact: true }).click();
    }
    const segments = mobile
      ? page.getByRole("link", { name: "Segmentos", exact: true })
      : page.getByRole("menuitem", { name: "Segmentos", exact: true });
    await segments.click();
    await page
      .getByRole("dialog", { name: /Descartar altera/ })
      .getByRole("button", { name: "Continuar editando", exact: true })
      .click();
    await expect(page.getByLabel("Nome fantasia", { exact: true })).toHaveValue("Menu draft");
    await segments.click();
    await page
      .getByRole("dialog", { name: /Descartar altera/ })
      .getByRole("button", { name: "Descartar e sair", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Segmentos", exact: true })).toBeVisible();
  }
});

test("campaign advanced conditions apply explicitly and survive returning to the list", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/crm-campaigns"));
  await expect(page.getByRole("table")).toContainText("Campanha A");
  const before = await page.evaluate(() => (window as any).crmHarness.queries().length);
  await page
    .getByRole("button", { name: "Filtros de campanhas e resultados", exact: true })
    .click();
  await page.getByLabel("Código exato", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(await page.evaluate(() => (window as any).crmHarness.queries().length)).toBe(before);
  await page
    .getByRole("button", { name: "Filtros de campanhas e resultados", exact: true })
    .click();
  await expect(page.getByLabel("Código exato", { exact: true })).toHaveValue("");
  await page.getByLabel("Código exato", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).crmHarness.queries().at(-1)?.CODIGO))
    .toBe("10");
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/crm-results"));
  await page.evaluate(() => window.crmUiTest.navigate("/tenant-a/crm-campaigns"));
  await expect(page.getByRole("button", { name: "Código: 10", exact: true })).toBeVisible();
});
