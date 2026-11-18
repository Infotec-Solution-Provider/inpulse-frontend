"use client";

import { useRef, useState } from "react";
import { Alert, Button } from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "../whatsapp-context";

interface Candidate {
  id: number;
  name: string;
  phone: string;
}

function phoneDigits(value: string) {
  if (/@(?:lid|g\.us)$/i.test(value)) return "";
  const digits = value.split("@")[0].replace(/\D/g, "");
  return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
}

export function hasWhatsappLookup(number: string) {
  return phoneDigits(number).length >= 8;
}

export default function IntegratedCallContact({ number }: { number: string }) {
  const { token } = useAuthContext();
  const { wppApi, startChatByContactId, openChat, chats } = useWhatsappContext();
  const digits = phoneDigits(number);
  const [contacts, setContacts] = useState<Candidate[] | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  if (digits.length < 8) return null;

  async function findContacts() {
    if (!token || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const api = wppApi.current;
      api.setAuth(token);
      const response = await api.getContactsWithCustomer({ phone: digits, page: 1, perPage: 50 });
      const exact = new Map<number, Candidate>();
      for (const contact of response.data) {
        if (phoneDigits(contact.phone) === digits) {
          exact.set(contact.id, { id: contact.id, name: contact.name, phone: contact.phone });
        }
      }
      setContacts([...exact.values()]);
    } catch {
      setError("Não foi possível localizar os contatos deste número.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function openContact(contact: Candidate) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const existing = chats.find((chat) => chat.contactId === contact.id && !chat.isFinished);
      if (existing) openChat(existing);
      else await startChatByContactId(contact.id);
    } catch {
      setError("Não foi possível abrir a conversa deste contato.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="attendance-call-contact">
      <Button size="small" aria-disabled={pending} onClick={() => void findContacts()}>
        {contacts === null ? "Localizar conversa de WhatsApp" : "Atualizar contatos"}
      </Button>
      {contacts?.length === 0 && <p>Nenhum contato de WhatsApp para este número.</p>}
      {!!contacts?.length && (
        <div role="group" aria-label="Contatos encontrados" className="flex flex-wrap gap-2">
          {contacts.map((contact) => (
            <Button
              key={contact.id}
              size="small"
              variant="outlined"
              aria-disabled={pending}
              onClick={() => void openContact(contact)}
            >
              {contact.name || contact.phone} · #{contact.id}
            </Button>
          ))}
        </div>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </div>
  );
}
