import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  acknowledgeCrmOperations,
  confirmCrmOperation,
  pendingCrmOperations,
  performCrmOperation,
} from "./crm-operation-journal";
const context = {
    instance: "odim",
    operatorId: 534,
    token: "frozen-token",
    baseUrl: "https://fixture.invalid",
  },
  path = "/api/customers/crm-customers";
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
it("keeps the same unresolved Odim intent across equivalent tenant spellings", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(Error("lost"));
  await expect(performCrmOperation(context, "POST", path, { RAZAO: "draft" })).rejects.toThrow();
  expect(await pendingCrmOperations({ ...context, instance: " ÓDIM " })).toHaveLength(1);
});
it("keeps a confirmed create without a returned customer identity blocked until it can be read back", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(Error("lost"));
  await expect(performCrmOperation(context, "POST", path, { RAZAO: "draft" })).rejects.toThrow();
  const [entry] = await pendingCrmOperations(context);
  vi.mocked(fetch).mockResolvedValueOnce(json({ operationId: entry.operationId, outcome: "COMMITTED", status: "committed", retryAllowed: false }));
  await confirmCrmOperation(context, entry.operationId);
  await acknowledgeCrmOperations(context);
  await acknowledgeCrmOperations(context, 42);
  expect(await pendingCrmOperations(context)).toHaveLength(1);
});
it("persists UUID/payload before dispatch and retains a committed create until its record URL is read back", async () => {
  vi.mocked(fetch).mockImplementation(async () => {
    expect(await pendingCrmOperations(context)).toHaveLength(1);
    return json({ record: { CODIGO: 42, RAZAO: "Fixture" } });
  });
  await expect(
    performCrmOperation(context, "POST", path, { RAZAO: "Fixture" }),
  ).resolves.toMatchObject({ record: { CODIGO: 42 } });
  const [entry] = await pendingCrmOperations(context);
  expect(entry.confirmed).toBe(true);
  expect((vi.mocked(fetch).mock.calls[0][1]?.headers as any)["x-crm-operation-id"]).toBe(
    entry.operationId,
  );
  expect(JSON.stringify(entry)).not.toContain(context.token);
  await acknowledgeCrmOperations(context);
  expect(await pendingCrmOperations(context)).toHaveLength(1);
  await acknowledgeCrmOperations(context, 42);
  expect(await pendingCrmOperations(context)).toHaveLength(0);
});
it("preserves lost responses/reload and repeated intent only consults the same UUID without another POST", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError("response lost"));
  await expect(
    performCrmOperation(context, "POST", path, { RAZAO: "draft" }),
  ).rejects.toMatchObject({ response: { data: { outcome: "UNKNOWN" } } });
  const [entry] = await pendingCrmOperations(context);
  vi.mocked(fetch).mockResolvedValueOnce(
    json({
      operationId: entry.operationId,
      outcome: "UNKNOWN",
      status: "not_found",
      retryAllowed: false,
    }),
  );
  await expect(
    performCrmOperation({ ...context }, "POST", path, { RAZAO: "draft" }),
  ).rejects.toMatchObject({ response: { data: { outcome: "UNKNOWN" } } });
  expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  expect(vi.mocked(fetch).mock.calls[1][0]).toContain(entry.operationId);
  expect(await pendingCrmOperations(context)).toHaveLength(1);
});
it("blocks changed payload and concurrent tab dispatch while the first write is unresolved", async () => {
  let release!: (value: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const first = performCrmOperation(context, "POST", path, { RAZAO: "first" });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await expect(
    performCrmOperation(context, "PATCH", path + "/42", { changes: { RAZAO: "other" } }),
  ).rejects.toThrow("sem confirmação");
  expect(fetch).toHaveBeenCalledOnce();
  release(json({ record: { CODIGO: 42 } }));
  await first;
});
it("receipt confirmation never replays a write, retains proof until acknowledgement and cannot cross identities", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(Error("lost"));
  await expect(
    performCrmOperation(context, "PATCH", path + "/42", { changes: { RAZAO: "draft" } }),
  ).rejects.toThrow();
  const [entry] = await pendingCrmOperations(context);
  await expect(
    confirmCrmOperation({ ...context, operatorId: 535 }, entry.operationId),
  ).rejects.toThrow("sessão atual");
  await expect(
    confirmCrmOperation({ ...context, instance: "other" }, entry.operationId),
  ).rejects.toThrow("sessão atual");
  vi.mocked(fetch).mockResolvedValueOnce(
    json({
      operationId: entry.operationId,
      outcome: "COMMITTED",
      status: "committed",
      retryAllowed: false,
      result: { entity: "customer", customerId: 42, id: 42 },
    }),
  );
  await expect(confirmCrmOperation(context, entry.operationId)).resolves.toMatchObject({
    outcome: "COMMITTED",
  });
  expect((await pendingCrmOperations(context))[0].confirmed).toBe(true);
  await acknowledgeCrmOperations(context, 42);
  expect(await pendingCrmOperations(context)).toHaveLength(0);
});
it("does not dispatch without durable storage and does not retry a 401 write", async () => {
  vi.stubGlobal("indexedDB", {
    open() {
      throw Error("blocked");
    },
  });
  await expect(performCrmOperation(context, "POST", path, {})).rejects.toMatchObject({
    response: { data: { outcome: "NOT_COMMITTED" } },
  });
  expect(fetch).not.toHaveBeenCalled();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  );
  await expect(performCrmOperation(context, "POST", path, {})).rejects.toThrow();
  expect(fetch).toHaveBeenCalledOnce();
  expect(await pendingCrmOperations(context)).toHaveLength(1);
});
it("clears only proven NOT_COMMITTED and keeps malformed or missing receipts unresolved", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(Error("lost"));
  await expect(
    performCrmOperation(context, "DELETE", path + "/42/contacts/9", { version: "old" }),
  ).rejects.toThrow();
  const [entry] = await pendingCrmOperations(context);
  vi.mocked(fetch).mockResolvedValueOnce(
    json({ operationId: "wrong", outcome: "COMMITTED", retryAllowed: false }),
  );
  await expect(confirmCrmOperation(context, entry.operationId)).rejects.toThrow();
  expect(await pendingCrmOperations(context)).toHaveLength(1);
  vi.mocked(fetch).mockResolvedValueOnce(
    json({
      operationId: entry.operationId,
      outcome: "NOT_COMMITTED",
      status: "unconfirmed",
      retryAllowed: false,
    }),
  );
  await confirmCrmOperation(context, entry.operationId);
  expect(await pendingCrmOperations(context)).toHaveLength(0);
});
