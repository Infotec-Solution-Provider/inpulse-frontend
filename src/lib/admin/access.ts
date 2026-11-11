/** This controls discovery only; admin-service validates the authenticated actor. */
export function canOpenAdminConsole(instance: string, role: string | null | undefined): boolean {
  return instance === "infotec" && role === "ADMIN";
}

export async function bootstrapAdminSession(token: string): Promise<void> {
  const response = await fetch("/infotec/admin/api/session", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Não foi possível abrir a sessão administrativa.");
  }
}
