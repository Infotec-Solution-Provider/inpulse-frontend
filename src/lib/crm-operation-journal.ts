import { isManagedOperatorTenant } from "./operator-features";
export interface CrmOperationContext {
  instance: string;
  operatorId: number;
  token: string;
  baseUrl: string;
}
export interface PendingCrmOperation {
  operationId: string;
  identity: string;
  method: string;
  path: string;
  payload: unknown;
  createdAt: string;
  confirmed?: boolean;
  result?: CrmOperationReceipt["result"];
}
export interface CrmOperationReceipt {
  operationId: string;
  outcome: "COMMITTED" | "NOT_COMMITTED" | "UNKNOWN";
  status: string;
  retryAllowed: false;
  result?: { entity: "customer" | "contact" | "brand"; customerId: number; id: number };
}
const identity = (context: CrmOperationContext) =>
  `${isManagedOperatorTenant(context.instance) ? "odim" : context.instance}:${context.operatorId}:central-v1`;
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("inpulse-crm-operation-journal", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("operations", { keyPath: "operationId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function failure(
  message: string,
  outcome = "UNKNOWN",
  status?: number,
  code = "CRM_OPERATION_UNCONFIRMED",
) {
  return Object.assign(new Error(message), {
    response: { status, data: { message, outcome, code } },
  });
}
export async function pendingCrmOperations(
  context: CrmOperationContext,
): Promise<PendingCrmOperation[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("operations", "readonly"),
        request = tx.objectStore("operations").getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as PendingCrmOperation[]).filter(
            (row) => row.identity === identity(context),
          ),
        );
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
async function remove(operationId: string) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("operations", "readwrite");
      tx.objectStore("operations").delete(operationId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
async function confirmed(
  context: CrmOperationContext,
  operationId: string,
  result?: CrmOperationReceipt["result"],
) {
  const entry = (await pendingCrmOperations(context)).find(
    (row) => row.operationId === operationId,
  );
  if (!entry) throw failure("Não foi possível preservar a confirmação do registro.");
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("operations", "readwrite");
      tx.objectStore("operations").put({ ...entry, confirmed: true, result });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
/** Only the UI's completed readback acknowledges a confirmed mutation. */
export async function acknowledgeCrmOperations(context: CrmOperationContext, customerId?: number) {
  for (const entry of await pendingCrmOperations(context))
    if (
      entry.confirmed &&
      (!(entry.method === "POST" && entry.path === "/api/customers/crm-customers") ||
        (Number.isSafeInteger(customerId) &&
          Number(customerId) > 0 &&
          entry.result?.customerId === customerId))
    )
      await remove(entry.operationId);
}
async function reserve(
  context: CrmOperationContext,
  method: string,
  path: string,
  payload: unknown,
): Promise<{ entry: PendingCrmOperation; created: boolean }> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("operations", "readwrite"),
        store = tx.objectStore("operations"),
        request = store.getAll();
      let result: { entry: PendingCrmOperation; created: boolean };
      request.onsuccess = () => {
        const previous = (request.result as PendingCrmOperation[]).find(
          (row) => row.identity === identity(context),
        );
        if (previous) result = { entry: previous, created: false };
        else {
          const entry = {
            operationId: crypto.randomUUID(),
            identity: identity(context),
            method,
            path,
            payload: structuredClone(payload),
            createdAt: new Date().toISOString(),
          };
          store.add(entry);
          result = { entry, created: true };
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
const headers = (context: CrmOperationContext) => ({
  Authorization: `Bearer ${context.token.replace(/^Bearer\s+/i, "")}`,
  "Content-Type": "application/json",
  "x-crm-instance": context.instance,
});
export async function confirmCrmOperation(
  context: CrmOperationContext,
  operationId: string,
): Promise<CrmOperationReceipt> {
  const entries = await pendingCrmOperations(context);
  if (!entries.some((row) => row.operationId === operationId))
    throw failure("Esta operação não pertence à sessão atual.");
  const response = await fetch(
    `${context.baseUrl.replace(/\/$/, "")}/api/customers/crm-customers/operations/${encodeURIComponent(operationId)}`,
    { cache: "no-store", headers: headers(context) },
  );
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json"))
    throw failure("Não foi possível conferir o registro. Tente verificar novamente.");
  const receipt = (await response.json()).data as CrmOperationReceipt;
  if (
    receipt?.operationId !== operationId ||
    !["COMMITTED", "NOT_COMMITTED", "UNKNOWN"].includes(receipt.outcome) ||
    receipt.retryAllowed !== false
  )
    throw failure("A confirmação do registro ainda está indisponível.");
  if (receipt.outcome === "NOT_COMMITTED") await remove(operationId);
  if (receipt.outcome === "COMMITTED") await confirmed(context, operationId, receipt.result);
  return receipt;
}
export async function performCrmOperation<T>(
  context: CrmOperationContext,
  method: string,
  path: string,
  payload: unknown,
): Promise<T> {
  if (
    !context.instance ||
    !Number.isSafeInteger(context.operatorId) ||
    context.operatorId < 1 ||
    !context.token
  )
    throw failure("Atualize sua sessão antes de salvar.", "NOT_COMMITTED", 400);
  let reservation: Awaited<ReturnType<typeof reserve>>;
  try {
    reservation = await reserve(context, method, path, payload);
  } catch {
    throw failure(
      "Não foi possível preservar o registro local. Nenhuma alteração foi enviada.",
      "NOT_COMMITTED",
      400,
    );
  }
  const { entry, created } = reservation;
  if (!created) {
    if (
      entry.path !== path ||
      entry.method !== method ||
      JSON.stringify(entry.payload) !== JSON.stringify(payload)
    )
      throw failure(
        "Há um registro sem confirmação. Verifique seu resultado antes de salvar outra alteração.",
      );
    const receipt = await confirmCrmOperation(context, entry.operationId);
    throw failure(
      receipt.outcome === "COMMITTED"
        ? "Registro confirmado; atualize os dados antes de continuar."
        : receipt.outcome === "NOT_COMMITTED"
          ? "O registro não foi aplicado. Confira os dados antes de salvar novamente."
          : "O registro ainda está sem confirmação. Verifique novamente.",
      receipt.outcome,
      receipt.outcome === "UNKNOWN" ? undefined : 200,
      "CRM_OPERATION_RECEIPT",
    );
  }
  let response: Response, result: any;
  try {
    response = await fetch(`${context.baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers: { ...headers(context), "x-crm-operation-id": entry.operationId },
      body: JSON.stringify(entry.payload),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw Error();
    result = await response.json();
  } catch {
    throw failure(
      "Não foi possível confirmar o registro. O rascunho foi preservado; verifique o resultado antes de continuar.",
    );
  }
  const outcome = result?.outcome ?? result?.data?.outcome;
  if (!response.ok || outcome === "UNKNOWN" || outcome === "NOT_COMMITTED") {
    if (outcome === "NOT_COMMITTED") await remove(entry.operationId);
    throw failure(
      result?.message || "Não foi possível confirmar o registro. Verifique seu resultado.",
      outcome === "NOT_COMMITTED" ? outcome : "UNKNOWN",
      response.status,
      result?.code,
    );
  }
  const entity = path.includes("/contacts")
    ? "contact"
    : path.includes("/brands")
      ? "brand"
      : "customer";
  const customerId =
    entity === "customer" ? Number(result.data?.record?.CODIGO) : Number(path.split("/")[4]);
  const id = Number(result.data?.record?.CODIGO);
  await confirmed(
    context,
    entry.operationId,
    Number.isSafeInteger(customerId) && customerId > 0 && Number.isSafeInteger(id)
      ? { entity, customerId, id }
      : result.data?.result,
  );
  if (outcome === "COMMITTED")
    throw failure(
      "Registro confirmado; atualize os dados antes de continuar.",
      "COMMITTED",
      200,
      "CRM_OPERATION_RECEIPT",
    );
  return result.data as T;
}
