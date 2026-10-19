"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import type { WppContact } from "@/lib/sdk-local";
import SelectCustomerInput from "@/lib/components/select-customer-input";
import { useAppContext } from "../../../../app-context";
import { useWhatsappContext } from "../../../../whatsapp-context";

interface Candidate { id: number; name: string; cpfCnpj: string | null; erpCode: string | null }
interface Suggestions {
  status: "ready" | "disabled" | "unsupported" | "unavailable";
  candidates: Candidate[];
  truncated: boolean;
}

export default function LinkCustomerModal({ contact, onLinked }: { contact: WppContact; onLinked: () => Promise<void> }) {
  const { closeModal } = useAppContext();
  const { wppApi } = useWhatsappContext();
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    wppApi.current.ax.get<{ data: Suggestions }>(`/api/whatsapp/contacts/${contact.id}/customer-suggestions`)
      .then(({ data }) => { if (active) setSuggestions(data.data); })
      .catch(() => { if (active) setSuggestions({ status: "unavailable", candidates: [], truncated: false }); });
    return () => { active = false; mounted.current = false; };
  }, [contact.id, wppApi]);

  const confirm = async () => {
    if (!selected || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await wppApi.current.ax.post(`/api/whatsapp/contacts/${contact.id}/customer`, { customerId: selected.id });
      if (!mounted.current) return;
      await onLinked();
      if (!mounted.current) return;
      toast.success("Cliente vinculado ao contato.");
      closeModal();
    } catch (cause) {
      if (mounted.current) {
        const response = (cause as { response?: { status?: number; data?: { message?: string } } }).response;
        setError(response?.status === 409
          ? "O contato já foi alterado. Feche esta janela e atualize a lista antes de continuar."
          : response?.data?.message === "CONTACT_CUSTOMER_SYNC_PENDING"
            ? "O vínculo foi salvo, mas a sincronização com o CRM está pendente. Confirme novamente o mesmo cliente para tentar sincronizar."
          : "Não foi possível confirmar o vínculo. Confira o cadastro e tente novamente.");
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="link-customer-title" className="max-h-[85dvh] w-[34rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-white p-5 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
      <h2 id="link-customer-title" className="text-xl font-semibold">Vincular cliente</h2>
      <p className="mt-2 break-words text-sm">{contact.name} · {contact.phone || "Telefone indisponível"}</p>
      <p className="mb-4 mt-2 text-sm text-slate-600 dark:text-slate-300">
        Busque pelo CPF/CNPJ ou selecione uma sugestão. Confira o cliente antes de confirmar.
      </p>
      <SelectCustomerInput key={pickerKey} initialFilterBy="CPF_CNPJ" showDetails disabled={saving}
        onChange={(customer) => setSelected(customer ? {
          id: customer.CODIGO, name: customer.RAZAO || customer.FANTASIA || String(customer.CODIGO),
          cpfCnpj: customer.CPF_CNPJ || null, erpCode: customer.COD_ERP || null,
        } : null)} />

      <div className="mt-4" aria-live="polite">
        {!suggestions ? <p className="flex items-center gap-2 text-sm"><CircularProgress size={16} /> Consultando sugestões pelo telefone…</p> : suggestions.status === "ready" ? (
          <>
            <p className="text-sm font-medium">{suggestions.candidates.length ? "Clientes com o mesmo telefone" : "Nenhum cliente localizado por este telefone."}</p>
            {(suggestions.candidates.length > 1 || suggestions.truncated) && <p className="mt-1 text-sm">Há mais de uma correspondência. Use o CPF/CNPJ e o código para conferir o cliente correto.</p>}
            {suggestions.truncated && <p className="mt-1 text-sm">Exibindo até 10 opções. Refine a busca pelo CPF/CNPJ.</p>}
            <ul className="mt-2 space-y-2">
              {suggestions.candidates.map((candidate) => (
                <li key={candidate.id} className="rounded border border-slate-200 p-3 dark:border-slate-600">
                  <p className="break-words font-medium">{candidate.name}</p>
                  <p className="text-sm">Código {candidate.id} · {candidate.cpfCnpj || "CPF/CNPJ não informado"}{candidate.erpCode ? ` · ERP ${candidate.erpCode}` : ""}</p>
                  <Button size="small" disabled={saving} onClick={() => { setSelected(candidate); setPickerKey((key) => key + 1); }}>Selecionar este cliente</Button>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="text-sm text-slate-600 dark:text-slate-300">
          {suggestions.status === "disabled" ? "Sugestões por telefone ainda não estão habilitadas. Você pode buscar pelo CPF/CNPJ."
            : suggestions.status === "unsupported" ? "Este cadastro não permite a consulta por telefone. Busque pelo CPF/CNPJ."
              : "A consulta por telefone está indisponível no momento. Você pode tentar a busca pelo CPF/CNPJ."}
        </p>}
      </div>

      {selected && <div className="mt-4 rounded bg-slate-100 p-3 dark:bg-slate-700">
        <p className="text-sm">Cliente selecionado para confirmação</p>
        <p className="break-words font-semibold">{selected.name}</p>
        <p className="text-sm">Código {selected.id} · {selected.cpfCnpj || "CPF/CNPJ não informado"}{selected.erpCode ? ` · ERP ${selected.erpCode}` : ""}</p>
      </div>}
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">O vínculo vale para este contato nas consultas, inclusive nas conversas anteriores.</p>
      {error && <Alert severity="error" sx={{ marginTop: 2 }}>{error}</Alert>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button disabled={saving} onClick={closeModal}>Cancelar</Button>
        <Button variant="contained" disabled={!selected || saving} onClick={confirm}>{saving ? "Confirmando…" : "Confirmar vínculo"}</Button>
      </div>
    </div>
  );
}
