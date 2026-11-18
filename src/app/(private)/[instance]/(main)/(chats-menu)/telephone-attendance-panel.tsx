"use client";

import { useId } from "react";
import { Button, CircularProgress } from "@mui/material";
import { Phone, SquareCheck } from "lucide-react";
import type { WppContact } from "@/lib/sdk-local";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";
import type {
  CustomerCallHistoryDetail,
  CustomerFullDetail,
  CustomerPurchaseDetail,
} from "./(start-chat-modal)/customer-crm-detail-modal.types";
import type { TelephoneQueueItem } from "./telephone-dialer.types";
import {
  formatCurrency,
  formatDateTime,
  formatPhone,
  getHistoryResultLabel,
  normalizePhone,
} from "./telephone-attendance-format";
import "./telephone-attendance-panel.css";

interface TelephoneAttendancePanelProps {
  appointment: TelephoneQueueItem;
  onClose: () => void;
  call: {
    phone: string;
    status: string;
    dialing: boolean;
    canStart: boolean;
    canFinish: boolean;
    unavailableReason: string | null;
    onSelectPhone: (phone: string) => void;
    onStart: () => void;
    onFinish: () => void;
  };
  customer: {
    data: CustomerFullDetail["customer"] | null;
    loading: boolean;
    purchases: CustomerPurchaseDetail[];
    history: CustomerCallHistoryDetail[];
    onOpen: () => void;
  };
  whatsapp: {
    contacts: WppContact[];
    loading: boolean;
    error: string | null;
    startingContactId: number | null;
    registering: boolean;
    canRegister: boolean;
    onOpen: (contact: WppContact) => void;
    onRegister: () => void;
  };
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="telephone-attendance-panel-loading">
      <CircularProgress size={18} aria-label={label} />
    </div>
  );
}

export default function TelephoneAttendancePanel({
  appointment,
  onClose,
  call,
  customer,
  whatsapp,
}: TelephoneAttendancePanelProps) {
  const summaryId = useId();
  const { data } = customer;
  const observation = data?.OBS_OPERADOR || data?.OBS_ADMIN;
  return (
    <section className="telephone-attendance-panel" aria-label="Atendimento telefônico">
      <header className="telephone-attendance-panel-header">
        <div className="telephone-attendance-panel-top">
          <span>Atendimento telefônico</span>
          <OperationalIconButton label="Fechar atendimento telefônico" onClick={onClose}>
            <UiIcon name="close" scale="toolbar" />
          </OperationalIconButton>
        </div>
        <h2 className="telephone-attendance-panel-title">{appointment.contactName}</h2>
        <p className="telephone-attendance-panel-muted">{appointment.campaignName}</p>
        <span
          className="telephone-attendance-panel-status"
          role="status"
          data-active={call.dialing}
        >
          {call.status}
        </span>
        <dl className="telephone-attendance-panel-metadata">
          <div>
            <dt>Agendado</dt>
            <dd>{formatDateTime(appointment.scheduledAt)}</dd>
          </div>
          <div>
            <dt>Telefone atual</dt>
            <dd>{formatPhone(call.phone)}</dd>
          </div>
        </dl>
      </header>

      <div className="telephone-attendance-panel-actions">
        <Button
          variant="contained"
          size="small"
          startIcon={<UiIcon icon={Phone} scale="row" />}
          onClick={call.onStart}
          disabled={!call.canStart}
        >
          {call.dialing ? "Ligação em andamento" : "Iniciar ligação"}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<UiIcon icon={SquareCheck} scale="row" />}
          onClick={call.onFinish}
          disabled={!call.canFinish}
        >
          Finalizar atendimento
        </Button>
        {!call.canStart && !call.dialing && call.unavailableReason && (
          <p className="telephone-attendance-panel-muted">{call.unavailableReason}</p>
        )}
      </div>

      <section className="telephone-attendance-panel-group" aria-labelledby={summaryId}>
        <div className="telephone-attendance-panel-heading">
          <h3 id={summaryId}>Resumo do cliente</h3>
          {appointment.customerId != null && (
            <Button size="small" aria-label="Detalhes do cliente" onClick={customer.onOpen}>
              Ver cadastro
            </Button>
          )}
        </div>
        {customer.loading ? (
          <PanelLoading label="Carregando dados do cliente" />
        ) : data ? (
          <dl className="telephone-attendance-panel-facts">
            {data.RAZAO && (
              <div>
                <dt>Razão social</dt>
                <dd>{data.RAZAO}</dd>
              </div>
            )}
            {data.FANTASIA && (
              <div>
                <dt>Nome fantasia</dt>
                <dd>{data.FANTASIA}</dd>
              </div>
            )}
            {data.CPF_CNPJ && (
              <div>
                <dt>CPF/CNPJ</dt>
                <dd>{data.CPF_CNPJ}</dd>
              </div>
            )}
            {customer.purchases[0]?.DATA && (
              <div>
                <dt>Última compra</dt>
                <dd>{formatDateTime(customer.purchases[0].DATA)}</dd>
              </div>
            )}
            {observation && (
              <div>
                <dt>Observações do operador</dt>
                <dd>{observation}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="telephone-attendance-panel-muted">
            {appointment.customerId == null
              ? "Cliente sem cadastro vinculado."
              : "Dados do cliente indisponíveis."}
          </p>
        )}
      </section>

      {(appointment.phoneOptions.length > 1 || appointment.notes) && (
        <details className="telephone-attendance-panel-group">
          <summary>Telefones do atendimento</summary>
          <div className="telephone-attendance-panel-items">
            {appointment.phoneOptions.map((option) => (
              <button
                type="button"
                key={option.key}
                className="telephone-attendance-panel-row"
                aria-pressed={call.phone === option.phone}
                disabled={call.dialing}
                onClick={() => call.onSelectPhone(option.phone)}
              >
                <strong>{formatPhone(option.phone)}</strong>
                {option.description && <span>{option.description}</span>}
              </button>
            ))}
            {appointment.notes &&
              !appointment.phoneOptions.some(
                (option) => option.description === appointment.notes,
              ) && <p className="telephone-attendance-panel-muted">{appointment.notes}</p>}
          </div>
        </details>
      )}

      <details className="telephone-attendance-panel-group">
        <summary>Contatos do WhatsApp</summary>
        <div className="telephone-attendance-panel-items">
          {whatsapp.loading ? (
            <PanelLoading label="Carregando contatos do WhatsApp" />
          ) : whatsapp.error ? (
            <p className="telephone-attendance-panel-error" role="alert">
              {whatsapp.error}
            </p>
          ) : whatsapp.contacts.length ? (
            whatsapp.contacts.map((contact) => (
              <button
                type="button"
                key={contact.id}
                className="telephone-attendance-panel-row"
                onClick={() => whatsapp.onOpen(contact)}
                disabled={whatsapp.startingContactId !== null}
              >
                <strong>{contact.name}</strong>
                <span>
                  {formatPhone(contact.phone)}
                  {normalizePhone(contact.phone) === normalizePhone(call.phone) &&
                    " · Telefone atual"}
                </span>
                <span>{whatsapp.startingContactId === contact.id ? "Abrindo…" : "Conversar"}</span>
              </button>
            ))
          ) : (
            <p className="telephone-attendance-panel-muted">
              Nenhum contato de WhatsApp encontrado.
            </p>
          )}
          {whatsapp.canRegister && (
            <Button
              variant="outlined"
              size="small"
              onClick={whatsapp.onRegister}
              disabled={whatsapp.registering}
            >
              {whatsapp.registering ? "Cadastrando…" : "Cadastrar telefone atual"}
            </Button>
          )}
        </div>
      </details>

      <details className="telephone-attendance-panel-group">
        <summary>Últimas compras</summary>
        <div className="telephone-attendance-panel-items">
          {customer.loading ? (
            <PanelLoading label="Carregando compras" />
          ) : customer.purchases.length ? (
            customer.purchases.map((purchase) => (
              <div key={purchase.CODIGO} className="telephone-attendance-panel-row">
                <strong>{purchase.DESCRICAO || `Compra #${purchase.CODIGO}`}</strong>
                <span>
                  {formatDateTime(purchase.DATA)}
                  {purchase.FORMA_PGTO && ` · ${purchase.FORMA_PGTO}`}
                </span>
                <span>{formatCurrency(purchase.VALOR)}</span>
              </div>
            ))
          ) : (
            <p className="telephone-attendance-panel-muted">Nenhuma compra encontrada.</p>
          )}
        </div>
      </details>

      <details className="telephone-attendance-panel-group">
        <summary>Histórico recente</summary>
        <div className="telephone-attendance-panel-items">
          {customer.loading ? (
            <PanelLoading label="Carregando histórico" />
          ) : customer.history.length ? (
            customer.history.map((entry) => (
              <div key={entry.CODIGO} className="telephone-attendance-panel-row">
                <strong>{getHistoryResultLabel(entry)}</strong>
                <span>
                  {entry.CANAL_ATENDIMENTO || entry.TIPO_ACAO || "Ligação"} ·{" "}
                  {formatPhone(entry.FONE_RECEPTIVO)}
                </span>
                <span>{formatDateTime(entry.LIGACAO_FINALIZADA || entry.LIGACAO_RECEBIDA)}</span>
                {entry.OBS && <span>{entry.OBS}</span>}
              </div>
            ))
          ) : (
            <p className="telephone-attendance-panel-muted">Nenhum registro encontrado.</p>
          )}
        </div>
      </details>

      <footer className="telephone-attendance-panel-footer">
        Atendimento #{appointment.campaignClientId}
      </footer>
    </section>
  );
}
