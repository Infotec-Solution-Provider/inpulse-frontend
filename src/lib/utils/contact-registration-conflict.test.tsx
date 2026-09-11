import { AxiosError } from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ContactRegistrationConflict, Customer } from "@/lib/sdk-local";
import WhatsappClient from "@/lib/sdk-local/whatsapp.client";
import ContactRegistrationConflictModal from "@/app/(private)/[instance]/(cruds)/contacts/(table)/(modal)/contact-registration-conflict-modal";
import { getContactRegistrationConflict } from "./contact-registration-conflict";

const makeConflict = (
  contact: Partial<ContactRegistrationConflict["existingContact"]> = {},
): ContactRegistrationConflict => ({
  code: "CONTACT_ALREADY_EXISTS",
  message: "Contato já cadastrado.",
  requiresSupervisorApproval: false,
  existingContact: {
    id: 8,
    instance: "test",
    name: "Maria",
    phone: "5511999999999",
    isBlocked: false,
    isOnlyAdmin: false,
    isDeleted: false,
    ...contact,
  },
});

const renderConflict = (conflict: ContactRegistrationConflict) =>
  renderToStaticMarkup(
    <ContactRegistrationConflictModal
      conflict={conflict}
      onCancel={() => {}}
      onConfirm={async () => {}}
    />,
  );

describe("contact registration conflict", () => {
  it("retains the linked customer through the SDK HTTP error interceptor", async () => {
    const conflict = makeConflict({
      customerId: 42,
      customer: { CODIGO: 42, RAZAO: "Cliente Exemplo" } as Customer,
    });
    const client = new WhatsappClient("http://localhost:8005");
    client.ax.defaults.adapter = async (config) => {
      throw new AxiosError("Conflict", "ERR_BAD_REQUEST", config, undefined, {
        config,
        data: conflict,
        status: 409,
        statusText: "Conflict",
        headers: {},
      });
    };

    const error = await client.createContact("Maria", "5511999999999", 99).catch((err) => err);
    const result = getContactRegistrationConflict(error);
    expect(result).toEqual(conflict);
    expect(renderConflict(result!)).toContain(
      "Este número já está cadastrado no cliente Cliente Exemplo (#42).",
    );
  });

  it("accepts a direct HTTP error and preserves overwrite confirmation", () => {
    const conflict = makeConflict({ customerId: 42 });
    expect(getContactRegistrationConflict({ response: { data: conflict } })).toBe(conflict);
    const html = renderConflict(conflict);
    expect(html).toContain("Cliente (#42)");
    expect(html).toContain("Sobrescrever cadastro");
  });

  it.each([undefined, 0, -1])(
    "does not display missing customer %s as a linked customer",
    (customerId) => {
      const html = renderConflict(makeConflict({ customerId }));
      expect(html).toContain("não possui cliente vinculado");
      expect(html).toContain("Nenhum cliente vinculado");
      expect(html).not.toContain("Cliente (#");
    },
  );

  it("retains the supervisor approval action for a deleted contact", () => {
    const conflict = { ...makeConflict({ isDeleted: true }), requiresSupervisorApproval: true };
    const html = renderConflict(conflict);
    expect(html).toContain("Enviar solicitação");
    expect(html).not.toContain("Reativar e sobrescrever");
  });

  it("does not interpret unrelated or incomplete errors as registration conflicts", () => {
    expect(getContactRegistrationConflict(new Error("Falha de conexão"))).toBeNull();
    expect(
      getContactRegistrationConflict({ response: { data: { code: "CONTACT_ALREADY_EXISTS" } } }),
    ).toBeNull();
    const cyclicError: { cause?: unknown } = {};
    cyclicError.cause = cyclicError;
    expect(getContactRegistrationConflict(cyclicError)).toBeNull();
  });
});
