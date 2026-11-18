"use client";

import { useState } from "react";
import { Button, Alert } from "@mui/material";
import { Phone } from "lucide-react";
import { useAppContext } from "../app-context";
import { useWhatsappContext } from "../whatsapp-context";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { normalizeDialTarget } from "@/lib/telephony/types";
import CustomerCrmDetailModal from "./(chats-menu)/(start-chat-modal)/customer-crm-detail-modal";

export function IntegratedCustomer() {
  const { currentChat, isReadOnlyMode, parameters } = useWhatsappContext();
  const { openModal, closeModal } = useAppContext();
  const phone = useTelephony();
  const [error, setError] = useState<string | null>(null);
  if (currentChat?.chatType !== "wpp") return null;
  const customer = currentChat.customer;
  const contact = currentChat.contact;
  const number = contact?.phone?.split("@")[0] || "";
  let target = "";
  // WhatsApp LIDs and group identifiers are not phone numbers.
  if (number && !/@(?:lid|g\.us)$/i.test(contact?.phone || "")) {
    try {
      const normalized = normalizeDialTarget(number);
      if (/^\+?[0-9]{8,15}$/.test(normalized)) target = normalized;
    } catch {
      /* A contact can lack a usable dial target. */
    }
  }
  const showCustomer = (customerId: number, initialTab: "main" | "observations") => {
    openModal(
      <CustomerCrmDetailModal
        customerId={customerId}
        onClose={closeModal}
        canEdit={parameters["customer_detail_edit_enabled"] === "true"}
        initialTab={initialTab}
      />,
    );
  };
  return (
    <section className="attendance-customer" aria-label="Ficha do cliente">
      <h2>Ficha do cliente</h2>
      <strong>{contact?.name || "Contato"}</strong>
      <p>{customer?.RAZAO || "Cliente sem vínculo no CRM"}</p>
      {target && <p>{number}</p>}
      <div className="flex flex-wrap gap-2">
        {target && !isReadOnlyMode && !currentChat.isFinished && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Phone size={15} />}
            disabled={
              phone.busy ||
              phone.state.connection !== "ready" ||
              phone.operatorState?.state === "paused"
            }
            onClick={() => {
              setError(null);
              void phone
                .dial(target)
                .catch((reason) =>
                  setError(reason instanceof Error ? reason.message : "Não foi possível ligar."),
                );
            }}
          >
            Ligar
          </Button>
        )}
        {customer?.CODIGO && (
          <>
            <Button size="small" onClick={() => showCustomer(customer.CODIGO, "main")}>
              Consultar cadastro
            </Button>
            <Button size="small" onClick={() => showCustomer(customer.CODIGO, "observations")}>
              Observações
            </Button>
          </>
        )}
      </div>
      {error && <Alert severity="error">{error}</Alert>}
    </section>
  );
}
