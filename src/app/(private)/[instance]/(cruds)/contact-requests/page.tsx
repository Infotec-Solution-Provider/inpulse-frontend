"use client";

import { CrmPage } from "@/lib/ui-system";
import { useAuthContext } from "@/app/auth-context";
import { ContactActionRequest, UserRole, WppContactWithCustomer } from "@/lib/sdk-local";
import { CancelOutlined as CancelOutlinedIcon } from "@/lib/ui-system/crm-icons";
import { CheckCircleOutline as CheckCircleOutlineIcon } from "@/lib/ui-system/crm-icons";
import { Replay as ReplayIcon } from "@/lib/ui-system/crm-icons";
import { Alert, Button, Chip, CircularProgress, Pagination, Paper, Tab, Tabs } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useWhatsappContext } from "../../whatsapp-context";

type PageTab = "requests" | "deleted";

const customerLabel = (contact: WppContactWithCustomer) =>
  contact.customer
    ? `${contact.customer.RAZAO || contact.customer.FANTASIA || "Cliente"} (#${contact.customer.CODIGO})`
    : contact.customerId
      ? `Cliente #${contact.customerId}`
      : "Sem cliente vinculado";

export default function ContactRequestsPage() {
  const { user } = useAuthContext();
  const { wppApi } = useWhatsappContext();
  const [tab, setTab] = useState<PageTab>("requests");
  const [requests, setRequests] = useState<ContactActionRequest[]>([]);
  const [deletedContacts, setDeletedContacts] = useState<WppContactWithCustomer[]>([]);
  const [deletedPage, setDeletedPage] = useState(1);
  const [deletedTotalPages, setDeletedTotalPages] = useState(1);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (user?.NIVEL !== UserRole.ADMIN) return;
    setLoading(true);
    try {
      const [requestData, deletedData] = await Promise.all([
        wppApi.current.getContactActionRequests(),
        wppApi.current.getDeletedContacts(deletedPage, 20),
      ]);
      setRequests(Array.isArray(requestData) ? requestData : []);
      setDeletedContacts(Array.isArray(deletedData?.data) ? deletedData.data : []);
      setDeletedTotalPages(Math.max(1, Number(deletedData?.pagination?.totalPages) || 1));
      setDeletedTotal(Math.max(0, Number(deletedData?.pagination?.total) || 0));
    } catch (error) {
      toast.error((error as Error).message || "Falha ao carregar solicitações.");
    } finally {
      setLoading(false);
    }
  }, [deletedPage, user?.NIVEL, wppApi]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const decide = async (requestId: number, decision: "APPROVE" | "REJECT") => {
    setProcessingId(requestId);
    try {
      await wppApi.current.decideContactActionRequest(requestId, decision);
      toast.success(decision === "APPROVE" ? "Solicitação aprovada!" : "Solicitação rejeitada.");
      await loadData();
    } catch (error) {
      toast.error((error as Error).message || "Falha ao analisar solicitação.");
    } finally {
      setProcessingId(null);
    }
  };

  const reactivate = async (contactId: number) => {
    setProcessingId(contactId);
    try {
      const result = await wppApi.current.reactivateContact(contactId);
      toast.success(
        result.outcome === "EXECUTED"
          ? "Contato reativado com sucesso!"
          : "Solicitação enviada ao supervisor!",
      );
      await loadData();
    } catch (error) {
      toast.error((error as Error).message || "Falha ao reativar contato.");
    } finally {
      setProcessingId(null);
    }
  };

  if (user?.NIVEL !== UserRole.ADMIN) {
    return <Alert severity="error">Esta tela é restrita a supervisores.</Alert>;
  }

  const pendingRequests = requests.filter((request) => request.status === "PENDING");

  return (
    <CrmPage
      title="Solicitações de contatos"
      description="Analise solicitações de exclusão e reativação e consulte contatos desativados."
      breadcrumbs={[{ label: "Comunicação" }, { label: "Solicitações de contatos" }]}
    >
      <Paper className="overflow-hidden">
        <Tabs
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Solicitações e contatos desativados"
          value={tab}
          onChange={(_, value) => setTab(value)}
        >
          <Tab value="requests" label={`Pendentes (${pendingRequests.length})`} />
          <Tab value="deleted" label={`Desativados (${deletedTotal})`} />
        </Tabs>

        {loading ? (
          <div className="flex justify-center p-12">
            <CircularProgress />
          </div>
        ) : tab === "requests" ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {pendingRequests.length === 0 ? (
              <div className="p-10 text-center text-[var(--ip-muted)]">
                Nenhuma solicitação pendente.
              </div>
            ) : (
              pendingRequests.map((request) => {
                const payload = request.payload ?? {};
                const isDeletion = request.action === "DELETE";
                return (
                  <div
                    key={request.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-[var(--ip-text)]">
                          {request.contact.name}
                        </h2>
                        <Chip
                          label={isDeletion ? "Exclusão" : "Reativação"}
                          color={isDeletion ? "error" : "info"}
                          size="small"
                        />
                        <Chip label="Aguardando aprovação" color="warning" size="small" />
                      </div>
                      <p className="mt-1 text-sm text-[var(--ip-text)]">
                        {request.contact.phone} ·{" "}
                        {customerLabel(request.contact as WppContactWithCustomer)}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ip-muted)]">
                        Solicitado por{" "}
                        {request.requestedByName || `usuário #${request.requestedBy}`}
                        {!isDeletion && (
                          <>
                            {" · "}Novo nome:{" "}
                            <strong>{payload.name || request.contact.name}</strong>
                            {payload.customerId
                              ? ` · Cliente proposto #${payload.customerId}`
                              : " · Sem cliente proposto"}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        color="error"
                        variant="outlined"
                        startIcon={<CancelOutlinedIcon />}
                        disabled={processingId === request.id}
                        onClick={() => void decide(request.id, "REJECT")}
                      >
                        Rejeitar
                      </Button>
                      <Button
                        color="success"
                        variant="contained"
                        startIcon={<CheckCircleOutlineIcon />}
                        disabled={processingId === request.id}
                        onClick={() => void decide(request.id, "APPROVE")}
                      >
                        Aprovar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {deletedContacts.length === 0 ? (
              <div className="p-10 text-center text-[var(--ip-muted)]">
                Nenhum contato desativado.
              </div>
            ) : (
              deletedContacts.map((contact) => {
                const hasPendingRequest = pendingRequests.some(
                  (request) => request.contactId === contact.id && request.action === "REACTIVATE",
                );
                return (
                  <div
                    key={contact.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <h2 className="font-semibold text-[var(--ip-text)]">{contact.name}</h2>
                      <p className="mt-1 text-sm text-[var(--ip-text)]">
                        {contact.phone} · {customerLabel(contact)}
                      </p>
                    </div>
                    <Button
                      variant="outlined"
                      startIcon={<ReplayIcon />}
                      disabled={processingId === contact.id || hasPendingRequest}
                      onClick={() => void reactivate(contact.id)}
                    >
                      {hasPendingRequest ? "Solicitação pendente" : "Reativar"}
                    </Button>
                  </div>
                );
              })
            )}
            {deletedTotalPages > 1 && (
              <div className="flex justify-center p-4">
                <Pagination
                  page={deletedPage}
                  count={deletedTotalPages}
                  onChange={(_, page) => setDeletedPage(page)}
                  color="primary"
                />
              </div>
            )}
          </div>
        )}
      </Paper>
    </CrmPage>
  );
}
