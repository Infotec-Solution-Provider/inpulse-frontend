import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/lib/sdk-local/types/user.types";
import UsersTable from "./table";
import { USERS_TABLE_COLUMNS } from "./table-config";

const session = vi.hoisted(() => ({ role: "ADMIN" as string | null, sipEnabled: true }));
vi.mock("@/lib/sdk-local", async () => ({
  UserRole: (await import("@/lib/sdk-local/types/user.types")).UserRole,
}));
vi.mock("@/app/auth-context", () => ({
  useAuthContext: () => ({ token: "test-token", user: { NIVEL: session.role } }),
}));
vi.mock("../../../whatsapp-context", () => ({
  useWhatsappContext: () => ({
    parameters: { feature_sip_config_enabled: session.sipEnabled ? "true" : "false" },
  }),
}));
vi.mock("../(modal)/user-sip-config-modal", () => ({ default: () => null }));
vi.mock("../users-context", () => ({
  useUsersContext: () => ({
    state: {
      users: [{ CODIGO: 42, NOME: "Maria", NIVEL: "RECEP", LOGIN: "maria", SETOR: 2 }],
      isLoading: false,
      totalRows: 1,
      filters: { page: "1", perPage: "10" },
    },
    sectors: [{ id: 2, name: "Atendimento" }],
    dispatch: vi.fn(),
    loadUsers: vi.fn(),
    openUserModal: vi.fn(),
  }),
}));

describe("users table API and authorization contract", () => {
  beforeEach(() => {
    session.role = UserRole.ADMIN;
    session.sipEnabled = true;
  });

  it("sends only API role values, including the real reception role", () => {
    const options = USERS_TABLE_COLUMNS.NIVEL.options.filter(({ value }) => value !== "{{all}}");
    const accepted = new Set<string>(Object.values(UserRole));
    expect(options.every(({ value }) => accepted.has(value))).toBe(true);
    expect(options.find(({ label }) => label === "Receptivo")?.value).toBe(UserRole.RECEPTIONIST);
  });

  it.each([UserRole.ACTIVE, UserRole.RECEPTIONIST, UserRole.BOTH, UserRole.EXTERNAL, null])(
    "does not render administrative actions for direct access as %s",
    (role) => {
      session.role = role;
      const html = renderToStaticMarkup(<UsersTable />);
      expect(html).toContain("Maria");
      expect(html).not.toContain("Cadastrar Usuário");
      expect(html).not.toContain('title="Editar Usuário"');
      expect(html).not.toContain('title="Configurar SIP"');
    },
  );

  it("preserves administrator actions and the SIP feature gate", () => {
    const enabled = renderToStaticMarkup(<UsersTable />);
    expect(enabled).toContain("Cadastrar Usuário");
    expect(enabled).toContain('title="Editar Usuário"');
    expect(enabled).toContain('title="Configurar SIP"');
    session.sipEnabled = false;
    const disabled = renderToStaticMarkup(<UsersTable />);
    expect(disabled).toContain('title="Editar Usuário"');
    expect(disabled).not.toContain('title="Configurar SIP"');
  });
});
