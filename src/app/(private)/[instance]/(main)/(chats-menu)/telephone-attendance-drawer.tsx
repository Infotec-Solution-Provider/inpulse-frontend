"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useAuthContext } from "@/app/auth-context";
import { useContactsContext } from "@/app/(private)/[instance]/(cruds)/contacts/contacts-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import customersService from "@/lib/services/customers.service";
import { WppContact } from "@in.pulse-crm/sdk";
import { Formatter, sanitizeErrorMessage } from "@in.pulse-crm/utils";
import AddIcCallIcon from "@mui/icons-material/AddIcCall";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import TimelineIcon from "@mui/icons-material/Timeline";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import CustomerCrmDetailModal from "./(start-chat-modal)/customer-crm-detail-modal";
import {
  CustomerCallHistoryDetail,
  CustomerFullDetail,
  CustomerPurchaseDetail,
} from "./(start-chat-modal)/customer-crm-detail-modal.types";
import { TelephoneQueueItem } from "./telephone-dialer.types";

interface TelephoneAttendanceDrawerProps {
  open: boolean;
  appointment: TelephoneQueueItem | null;
  isDialing: boolean;
  dialedPhone: string;
  onClose: () => void;
  onSelectPhone: (phone: string) => void;
  onStartDial: () => void;
  onOpenFinishModal: () => void;
}

function formatPhone(phone?: string | null) {
  if (!phone) return "-";

  try {
    return Formatter.phone(phone);
  } catch {
    return phone;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const parsedDate = new Date(value.includes("T") ? value : value.replace(" ", "T"));

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function formatCurrency(value?: number | null) {
  if (value == null) return "-";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getHistoryResultLabel(item: CustomerCallHistoryDetail) {
  if (item.RESULTADO_NOME?.trim()) {
    return item.RESULTADO_NOME;
  }

  return item.TIPO_ACAO === "RECEP" ? "Atendimento receptivo" : "Atendimento ativo";
}

function normalizePhone(phone?: string | null) {
  return phone?.replace(/\D/g, "") || "";
}

export default function TelephoneAttendanceDrawer({
  open,
  appointment,
  isDialing,
  dialedPhone,
  onClose,
  onSelectPhone,
  onStartDial,
  onOpenFinishModal,
}: TelephoneAttendanceDrawerProps) {
  const { token } = useAuthContext();
  const { parameters, startChatByContactId, wppApi } = useWhatsappContext();
  const { createContact } = useContactsContext();
  const { openModal, closeModal } = useAppContext();
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingWhatsappContacts, setLoadingWhatsappContacts] = useState(false);
  const [registeringWhatsappContact, setRegisteringWhatsappContact] = useState(false);
  const [startingContactId, setStartingContactId] = useState<number | null>(null);
  const [whatsappContacts, setWhatsappContacts] = useState<WppContact[]>([]);
  const [whatsappContactsError, setWhatsappContactsError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerFullDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!open || !appointment?.customerId || !token) {
        setDetail(null);
        return;
      }

      setLoadingDetail(true);

      try {
        customersService.setAuth(token);
        const response = await customersService.ax.get<{ message: string; data: CustomerFullDetail }>(
          `/api/customers/${appointment.customerId}/full`,
        );

        if (!cancelled) {
          setDetail(response.data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          toast.error(`Falha ao carregar dados do cliente: ${sanitizeErrorMessage(err)}`);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [appointment?.customerId, open, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadWhatsappContacts() {
      if (!open || !appointment) {
        setWhatsappContacts([]);
        setWhatsappContactsError(null);
        return;
      }

      setLoadingWhatsappContacts(true);
      setWhatsappContactsError(null);

      try {
        if (token) {
          wppApi.current.setAuth(token);
        }

        let contacts: WppContact[] = [];

        if (appointment.customerId) {
          contacts = await wppApi.current.getCustomerContacts(appointment.customerId);
        } else if (dialedPhone) {
          const response = await wppApi.current.getContactsWithCustomer({
            phone: normalizePhone(dialedPhone),
            page: 1,
            perPage: 20,
          });
          contacts = response.data.map((contact) => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            customerId: contact.customerId ?? undefined,
            avatarUrl: contact.avatarUrl ?? undefined,
            instance: contact.instance,
            isBlocked: contact.isBlocked,
            isOnlyAdmin: contact.isOnlyAdmin,
            lastOutOfHoursReplySentAt: contact.lastOutOfHoursReplySentAt ?? undefined,
            sectorIds: contact.sectorIds,
          }));
        }

        if (!cancelled) {
          const dedupedContacts = contacts.filter((contact, index, allContacts) => {
            return (
              allContacts.findIndex((candidate) => candidate.id === contact.id) === index
            );
          });
          setWhatsappContacts(dedupedContacts);
        }
      } catch (err) {
        if (!cancelled) {
          setWhatsappContacts([]);
          setWhatsappContactsError(sanitizeErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoadingWhatsappContacts(false);
        }
      }
    }

    void loadWhatsappContacts();

    return () => {
      cancelled = true;
    };
  }, [appointment, dialedPhone, open, token, wppApi]);

  const recentPurchases = useMemo(() => detail?.purchases.slice(0, 3) ?? [], [detail]);
  const recentHistory = useMemo(() => detail?.callHistory.slice(0, 5) ?? [], [detail]);
  const latestPurchaseAt = useMemo(() => {
    return detail?.purchases[0]?.DATA ?? null;
  }, [detail]);
  const selectedPhoneNormalized = normalizePhone(dialedPhone);
  const hasMatchingWhatsappContact = useMemo(() => {
    return whatsappContacts.some(
      (contact) => normalizePhone(contact.phone) === selectedPhoneNormalized,
    );
  }, [selectedPhoneNormalized, whatsappContacts]);

  const handleStartWhatsappConversation = async (contact: WppContact) => {
    setStartingContactId(contact.id);

    try {
      await startChatByContactId(contact.id);
      onClose();
    } catch (err) {
      toast.error(`Falha ao iniciar conversa no WhatsApp: ${sanitizeErrorMessage(err)}`);
    } finally {
      setStartingContactId(null);
    }
  };

  const handleRegisterWhatsappContact = async () => {
    if (!appointment || !selectedPhoneNormalized) {
      toast.info("Selecione um telefone valido para cadastrar no WhatsApp.");
      return;
    }

    setRegisteringWhatsappContact(true);

    try {
      const createdContact = await createContact(
        appointment.contactName,
        selectedPhoneNormalized,
        undefined,
        appointment.customerId ?? undefined,
      );

      if (!createdContact?.id) {
        throw new Error("Nao foi possivel cadastrar o contato de WhatsApp.");
      }

      setWhatsappContacts((currentContacts) => [...currentContacts, createdContact]);
      toast.success("Contato do WhatsApp cadastrado com sucesso.");
    } catch (err) {
      toast.error(`Falha ao cadastrar contato do WhatsApp: ${sanitizeErrorMessage(err)}`);
    } finally {
      setRegisteringWhatsappContact(false);
    }
  };

  const handleOpenCustomerDetail = () => {
    if (!appointment?.customerId) {
      toast.info("Este atendimento nao possui cliente vinculado.");
      return;
    }

    openModal(
      <CustomerCrmDetailModal
        customerId={appointment.customerId}
        onClose={closeModal}
        canEdit={parameters["customer_detail_edit_enabled"] === "true"}
      />,
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        className:
          "w-full max-w-[32rem] bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100",
      }}
    >
      <div className="flex h-full flex-col">
        <header className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  Atendimento telefonico
                </p>
                <Chip
                  size="small"
                  color={isDialing ? "success" : "warning"}
                  label={isDialing ? "Em discagem" : "Na fila"}
                />
              </div>
              <h2 className="mt-2 truncate text-lg font-semibold">
                {appointment?.contactName || "Atendimento sem cliente"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {appointment?.campaignName || "Sem campanha"}
              </p>
            </div>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/70">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Agendado para
              </p>
              <p className="mt-1 font-medium">{formatDateTime(appointment?.scheduledAt)}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/70">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Telefone atual
              </p>
              <p className="mt-1 font-medium">{formatPhone(dialedPhone)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="contained"
              color="success"
              startIcon={<PhoneInTalkIcon />}
              onClick={onStartDial}
            >
              {isDialing ? "Ligacao em andamento" : "Iniciar ligacao"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AssignmentTurnedInIcon />}
              onClick={onOpenFinishModal}
            >
              Finalizar atendimento
            </Button>
            <Button
              variant="outlined"
              startIcon={<LaunchIcon />}
              onClick={handleOpenCustomerDetail}
              disabled={!appointment?.customerId}
              sx={{
                color: "rgb(51 65 85)",
                borderColor: "rgb(148 163 184)",
                backgroundColor: "rgba(255,255,255,0.72)",
                "&:hover": {
                  borderColor: "rgb(100 116 139)",
                  backgroundColor: "rgba(248,250,252,0.95)",
                },
                ".dark &": {
                  color: "rgb(226 232 240)",
                },
              }}
              className="dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            >
              Detalhes do cliente
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!appointment ? null : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ScheduleIcon fontSize="small" />
                  <span>Telefones para atendimento</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {appointment.phoneOptions.map((phoneOption) => (
                    <button
                      key={`${appointment.id}-${phoneOption.phone}`}
                      type="button"
                      onClick={() => onSelectPhone(phoneOption.phone)}
                      className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                        dialedPhone === phoneOption.phone
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-slate-300 bg-transparent text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:text-slate-200"
                      }`}
                    >
                      <span className="block font-medium">{formatPhone(phoneOption.phone)}</span>
                      <span className="block text-xs opacity-80">
                        {phoneOption.description || "Sem descricao"}
                      </span>
                    </button>
                  ))}
                </div>
                {appointment.notes ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {appointment.notes}
                  </p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <WhatsAppIcon fontSize="small" />
                    <span>Contatos do WhatsApp</span>
                  </div>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcCallIcon />}
                    onClick={() => void handleRegisterWhatsappContact()}
                    disabled={
                      registeringWhatsappContact ||
                      !selectedPhoneNormalized ||
                      hasMatchingWhatsappContact
                    }
                  >
                    {registeringWhatsappContact ? "Cadastrando..." : "Cadastro rapido"}
                  </Button>
                </div>

                <div className="mt-3 space-y-3">
                  {loadingWhatsappContacts ? (
                    <div className="flex items-center justify-center py-6">
                      <CircularProgress size={22} />
                    </div>
                  ) : whatsappContactsError ? (
                    <p className="text-sm text-red-600 dark:text-red-300">{whatsappContactsError}</p>
                  ) : whatsappContacts.length ? (
                    whatsappContacts.map((contact) => {
                      const isSelectedPhone = normalizePhone(contact.phone) === selectedPhoneNormalized;

                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => void handleStartWhatsappConversation(contact)}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-950/20"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{contact.name}</p>
                              {isSelectedPhone ? (
                                <Chip size="small" color="success" label="Telefone atual" />
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatPhone(contact.phone)}
                            </p>
                          </div>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={startingContactId === contact.id ? "Abrindo..." : "Conversar"}
                          />
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Nenhum contato de WhatsApp encontrado para este cliente/telefone.
                    </div>
                  )}

                  {!hasMatchingWhatsappContact && selectedPhoneNormalized ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      O cadastro rapido usa o telefone atualmente selecionado no atendimento.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TimelineIcon fontSize="small" />
                  <span>Resumo do cliente</span>
                </div>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <CircularProgress size={26} />
                  </div>
                ) : detail ? (
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/70">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          Razao social
                        </p>
                        <p className="mt-1 font-medium">{detail.customer.RAZAO || "-"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/70">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          Fantasia
                        </p>
                        <p className="mt-1 font-medium">{detail.customer.FANTASIA || "-"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          CNPJ/CPF
                        </p>
                        <p className="mt-1 font-medium">{detail.customer.CPF_CNPJ || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          Ultima compra
                        </p>
                        <p className="mt-1 font-medium">{formatDateTime(latestPurchaseAt)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Observacoes do operador
                      </p>
                      <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 leading-6 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                        {detail.customer.OBS_OPERADOR || detail.customer.OBS_ADMIN || "Sem observacoes registradas."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Nao foi possivel carregar o detalhe do cliente para este atendimento.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCartCheckoutIcon fontSize="small" />
                  <span>Ultimas compras</span>
                </div>
                <div className="mt-3 space-y-3">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-6">
                      <CircularProgress size={22} />
                    </div>
                  ) : recentPurchases.length ? (
                    recentPurchases.map((purchase: CustomerPurchaseDetail) => (
                      <div
                        key={purchase.CODIGO}
                        className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{purchase.DESCRICAO || `Compra #${purchase.CODIGO}`}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatDateTime(purchase.DATA)} • {purchase.FORMA_PGTO || "Forma nao informada"}
                            </p>
                          </div>
                          <Chip size="small" label={formatCurrency(purchase.VALOR)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Nenhuma compra encontrada para este cliente.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TimelineIcon fontSize="small" />
                  <span>Historico recente</span>
                </div>
                <div className="mt-3 space-y-3">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-6">
                      <CircularProgress size={22} />
                    </div>
                  ) : recentHistory.length ? (
                    recentHistory.map((historyItem: CustomerCallHistoryDetail) => (
                      <div
                        key={historyItem.CODIGO}
                        className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{getHistoryResultLabel(historyItem)}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {historyItem.CANAL_ATENDIMENTO || historyItem.TIPO_ACAO || "Ligacao"}
                              {" • "}
                              {formatPhone(historyItem.FONE_RECEPTIVO)}
                            </p>
                          </div>
                          <Chip
                            size="small"
                            label={formatDateTime(historyItem.LIGACAO_FINALIZADA || historyItem.LIGACAO_RECEBIDA)}
                          />
                        </div>
                        {historyItem.OBS ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {historyItem.OBS}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Nenhum historico encontrado para este cliente.
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        <Divider />

        <footer className="bg-white/80 px-5 py-4 dark:bg-slate-800/90">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Somente um atendimento telefonico pode ficar ativo por vez.</span>
            <span>{appointment ? `#${appointment.campaignClientId}` : "Sem item selecionado"}</span>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}