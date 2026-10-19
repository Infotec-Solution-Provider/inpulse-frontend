import { expect, test, type Page } from "@playwright/test";
const url = "/tests/crm-marketing/index.html?panel=configuration";
const panel = (page: Page) =>
  page.getByRole("region", { name: "Usuários vinculados à campanha", exact: true });
async function prepare(page: Page, code = "81") {
  const section = panel(page);
  await section.getByLabel("Código do vínculo", { exact: true }).fill(code);
  await section
    .getByRole("combobox", { name: "Usuário ativo para vincular", exact: true })
    .fill("Usuário 2");
  await page.getByRole("option", { name: "Usuário 2 (#2)", exact: true }).click();
  return section;
}
test("campaign members are real named records and active options support paging", async ({
  page,
}) => {
  await page.goto(url);
  const section = panel(page);
  await expect(section.getByRole("cell", { name: "Bruno A", exact: true })).toBeVisible();
  await section.getByLabel("Código do vínculo", { exact: true }).fill("81");
  await section.getByRole("combobox", { name: "Usuário ativo para vincular", exact: true }).click();
  await expect(page.getByRole("option", { name: "Usuário 25 (#25)", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Carregar mais usuários", exact: true }).click();
  await page.getByRole("option", { name: "Usuário 25 (#25)", exact: true }).click();
  await section.getByRole("button", { name: "Vincular usuário", exact: true }).click();
  await expect(section.getByText("Usuário vinculado à campanha.")).toBeVisible();
  expect((await page.evaluate(() => (window as any).crmHarness.calls())).at(-1)).toMatchObject({
    name: "addCampaignMember",
    instance: "tenant-a",
    token: "token-a",
    payload: { id: 10, CODIGO: 81, OPERADOR: 25 },
  });
  expect(
    (await page.evaluate(() => (window as any).crmHarness.memberLookups())).some(
      (call: any) => call.page === 2,
    ),
  ).toBe(true);
});
test("removing an inactive member preserves the user and sends parent and operator CAS", async ({
  page,
}) => {
  await page.goto(url);
  await panel(page).getByRole("button", { name: "Remover vínculo 32", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Remover vínculo da campanha?" });
  await expect(
    dialog.getByText(/preserva o cadastro do usuário e as agendas existentes/),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Remover vínculo", exact: true }).click();
  await expect(panel(page).getByText("Vínculo removido. O usuário foi preservado.")).toBeVisible();
  expect((await page.evaluate(() => (window as any).crmHarness.calls())).at(-1).payload).toEqual({
    id: 10,
    linkId: 32,
    expected: { CAMPANHA: 10, OPERADOR: 9 },
  });
});
test("historical unsafe identities remain visible and occupied manual IDs cannot be resubmitted", async ({
  page,
}) => {
  await page.goto(url);
  const section = await prepare(page, "30");
  await expect(section.getByText("Sem usuário (histórico)", { exact: true })).toBeVisible();
  await expect(
    section.getByRole("button", { name: "Remover vínculo 31", exact: true }),
  ).toBeDisabled();
  await expect(
    section.getByRole("button", { name: "Vincular usuário", exact: true }),
  ).toBeDisabled();
  await expect(section.getByText(/Este código ou usuário já aparece/)).toBeVisible();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).filter((call: any) =>
      /CampaignMember$/.test(call.name),
    ),
  ).toEqual([]);
});
test("duplicate conflict preserves the chosen member and gates writes until explicit reread", async ({
  page,
}) => {
  await page.goto(url);
  const section = await prepare(page);
  await page.evaluate(() => (window as any).crmHarness.fault("conflict"));
  await section.getByRole("button", { name: "Vincular usuário", exact: true }).click();
  await expect(section.getByText(/Recarregue os vínculos e confira/)).toBeVisible();
  await expect(section.getByLabel("Código do vínculo", { exact: true })).toHaveValue("81");
  await expect(
    section.getByRole("button", { name: "Vincular usuário", exact: true }),
  ).toBeDisabled();
  await section.getByRole("button", { name: "Recarregar vínculos", exact: true }).click();
  await expect(
    section.getByRole("button", { name: "Vincular usuário", exact: true }),
  ).toBeEnabled();
});
test("unknown committed member is reconciled by listing without repeating POST", async ({
  page,
}) => {
  await page.goto(url);
  const section = await prepare(page);
  await page.evaluate(() => (window as any).crmHarness.fault("unknown"));
  await section.getByRole("button", { name: "Vincular usuário", exact: true }).click();
  await expect(
    section.getByRole("button", { name: "Vincular usuário", exact: true }),
  ).toBeDisabled();
  await section.getByRole("button", { name: "Recarregar vínculos", exact: true }).click();
  await expect(
    section.getByRole("button", { name: "Remover vínculo 81", exact: true }),
  ).toBeEnabled();
  await expect(
    section.getByRole("button", { name: "Vincular usuário", exact: true }),
  ).toBeDisabled();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).filter(
      (call: any) => call.name === "addCampaignMember",
    ),
  ).toHaveLength(1);
});
test("token renewal during a membership write keeps its pinned request and gates subsequent writes", async ({
  page,
}) => {
  await page.goto(url);
  const section = await prepare(page);
  await page.evaluate(() => (window as any).crmHarness.fault("delay"));
  await section.getByRole("button", { name: "Vincular usuário", exact: true }).click();
  await page.getByRole("button", { name: "Renovar sessão", exact: true }).click();
  await expect(section.getByText(/Sua sessão mudou/)).toBeVisible();
  await page.evaluate(() => (window as any).crmHarness.release());
  await expect(
    section.getByRole("button", { name: "Vincular usuário", exact: true }),
  ).toBeDisabled();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).find(
      (call: any) => call.name === "addCampaignMember",
    ),
  ).toMatchObject({ token: "token-a", instance: "tenant-a" });
});
test("tenant switch discards a delayed membership response and loads the new tenant names", async ({
  page,
}) => {
  await page.goto(url);
  await prepare(page);
  await page.evaluate(() => (window as any).crmHarness.fault("delay"));
  await panel(page).getByRole("button", { name: "Vincular usuário", exact: true }).click();
  await page.getByRole("button", { name: "Trocar tenant", exact: true }).click();
  await expect(panel(page).getByRole("cell", { name: "Bruno B", exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).crmHarness.release());
  await expect(panel(page).getByText("Usuário vinculado à campanha.")).toHaveCount(0);
  await expect(
    panel(page).getByRole("button", { name: "Remover vínculo 81", exact: true }),
  ).toHaveCount(0);
});
test("unknown deletion is confirmed from the membership list without repeating DELETE", async ({
  page,
}) => {
  await page.goto(url);
  await panel(page).getByRole("button", { name: "Remover vínculo 30", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Remover vínculo da campanha?" });
  await page.evaluate(() => (window as any).crmHarness.fault("unknown"));
  await dialog.getByRole("button", { name: "Remover vínculo", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Remover vínculo", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Conferir vínculos", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    panel(page).getByRole("button", { name: "Remover vínculo 30", exact: true }),
  ).toHaveCount(0);
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).filter(
      (call: any) => call.name === "removeCampaignMember",
    ),
  ).toHaveLength(1);
});

test("membership removal remains usable in dark mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}&dark`);
  await panel(page).getByRole("button", { name: "Remover vínculo 30", exact: true }).click();
  const button = await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remover vínculo", exact: true })
    .boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(844);
});
