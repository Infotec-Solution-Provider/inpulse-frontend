import { User, UserRole } from "@/lib/sdk-local";
import { describe, expect, it } from "vitest";
import projectDirectoryUser from "./project-directory-user";

describe("projectDirectoryUser", () => {
  it("keeps directory fields and removes credentials before RAM and IndexedDB", () => {
    const user = {
      CODIGO: 7,
      NOME: "Operador",
      LOGIN: "operador",
      WHATSAPP: "5551999999999",
      NIVEL: UserRole.ACTIVE,
      SETOR: 2,
      SETOR_NOME: "Atendimento",
      NOME_EXIBICAO: "Operador",
      AVATAR_ID: null,
      ATIVO: "SIM",
      SENHA: "secret",
      ASTERISK_SENHA: "secret-voip",
      SENHAEMAILOPERADOR: "secret-email",
    } as unknown as User;

    const projected = projectDirectoryUser(user) as unknown as Record<string, unknown>;

    expect(projected.CODIGO).toBe(7);
    expect(projected.NOME).toBe("Operador");
    expect(projected).not.toHaveProperty("SENHA");
    expect(projected).not.toHaveProperty("ASTERISK_SENHA");
    expect(projected).not.toHaveProperty("SENHAEMAILOPERADOR");
  });
});
