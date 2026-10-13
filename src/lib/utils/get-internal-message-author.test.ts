import { describe, expect, it } from "vitest";
import { User } from "@/lib/sdk-local";
import getInternalMessageAuthor from "./get-internal-message-author";

const users = [{ CODIGO: 7, NOME: "Ana Operadora" }] as User[];

describe("getInternalMessageAuthor", () => {
  it("prioriza o nome atribuído pelo administrador para um ID externo", () => {
    const names = new Map([["123456789@lid", "Carlos da Expedição"]]);

    expect(getInternalMessageAuthor("external:123456789@lid", new Map(), users, names)).toBe(
      "Carlos da Expedição",
    );
  });

  it("preserva o nome identificável recebido do WhatsApp", () => {
    expect(
      getInternalMessageAuthor("external:5511999999999@c.us:Maria Cliente", new Map(), users),
    ).toBe("Maria Cliente");
  });

  it("usa o cadastro de contatos quando o WhatsApp informa apenas o telefone", () => {
    const contacts = new Map([["5511999999999", "João Cliente"]]);

    expect(
      getInternalMessageAuthor("external:5511999999999@c.us:5511999999999", contacts, users),
    ).toBe("João Cliente");
  });

  it("mantém o ID visível enquanto ele ainda não foi identificado", () => {
    expect(getInternalMessageAuthor("external:987654321@lid", new Map(), users)).toBe("987654321");
  });

  it("resolve remetentes internos pela lista de usuários", () => {
    expect(getInternalMessageAuthor("user:7", new Map(), users)).toBe("Ana Operadora");
  });
});
