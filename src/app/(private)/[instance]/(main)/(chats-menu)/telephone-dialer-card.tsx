"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useAuthContext } from "@/app/auth-context";
import customersService from "@/lib/services/customers.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { ChevronRight } from "lucide-react";
import { UiIcon } from "@/lib/ui-system/icons";
import { Button } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { callPhaseLabels } from "@/lib/telephony/types";
import TelephoneAttendanceDrawer from "./telephone-attendance-drawer";
import TelephoneFinishModal from "./telephone-finish-modal";
import { mapTelephonyScheduleToQueueItem, TelephoneQueueItem } from "./telephone-dialer.types";

export default function TelephoneDialerCard() {
  const { token, instance, user } = useAuthContext();
  const authScope = useRef({ instance, userId: user?.CODIGO });
  authScope.current = { instance, userId: user?.CODIGO };
  const { openModal } = useAppContext();
  const phone = useTelephony();
  const [queue, setQueue] = useState<TelephoneQueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [isStartingDial, setIsStartingDial] = useState(false);

  const nextAppointment = useMemo(() => queue[0] ?? null, [queue]);
  const matchesCall = nextAppointment?.id === phone.state.scheduleId;
  const isDialing = matchesCall && phone.busy;
  const startedAt = matchesCall ? phone.state.startedAt : null;
  const callStatusLabel = matchesCall ? callPhaseLabels[phone.state.phase] : "Não iniciado";

  useEffect(() => {
    if (!nextAppointment) {
      setSelectedPhone("");
      return;
    }

    const hasSelectedPhone = nextAppointment.phoneOptions.some(
      (phoneOption) => phoneOption.phone === selectedPhone,
    );

    if (!hasSelectedPhone) {
      setSelectedPhone(nextAppointment.phone);
    }
  }, [nextAppointment, selectedPhone]);

  useEffect(() => {
    if (!token) {
      setQueue([]);
      setIsLoadingQueue(false);
      return;
    }

    const authToken = token;

    let cancelled = false;

    async function loadQueue() {
      setIsLoadingQueue(true);
      setQueueError(null);

      try {
        customersService.setAuth(authToken);
        const response = await customersService.getTelephonySchedules({
          page: "1",
          perPage: "20",
        });

        if (!cancelled) {
          setQueue(response.data.map(mapTelephonyScheduleToQueueItem));
        }
      } catch (err) {
        if (!cancelled) {
          setQueue([]);
          setQueueError(sanitizeErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQueue(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const reloadQueue = async () => {
    if (!token) {
      setQueue([]);
      return;
    }

    setIsLoadingQueue(true);
    setQueueError(null);

    try {
      customersService.setAuth(token);
      const response = await customersService.getTelephonySchedules({
        page: "1",
        perPage: "20",
      });

      setQueue(response.data.map(mapTelephonyScheduleToQueueItem));
    } catch (err) {
      setQueue([]);
      setQueueError(sanitizeErrorMessage(err));
      throw err;
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const handleStartDial = async () => {
    if (!nextAppointment) return;

    if (!token) {
      toast.error("Sessao invalida para iniciar atendimento.");
      return;
    }

    setIsStartingDial(true);

    try {
      await phone.dial(selectedPhone || nextAppointment.phone, nextAppointment.id);
    } catch (err) {
      toast.error(`Falha ao iniciar ligacao: ${sanitizeErrorMessage(err)}`);
    } finally {
      setIsStartingDial(false);
    }
  };

  const handleFinishAppointment = async (
    resultId: number,
    scheduleDate: string | undefined,
    operationId: string,
    finishedAt: string,
  ) => {
    if (!nextAppointment) return;
    if (phone.busy) throw new Error("Desligue a chamada antes de finalizar o atendimento.");

    if (!token) {
      throw new Error("Sessao invalida para finalizar atendimento.");
    }

    try {
      await phone.waitForSync();
      if (authScope.current.instance !== instance || authScope.current.userId !== user?.CODIGO)
        throw new Error("A empresa ou o usuário mudou. Releia a fila antes de finalizar.");
      await customersService.finishTelephonySchedule(
        nextAppointment.id,
        {
          operationId,
          resultId,
          scheduleDate,
          startedAt: startedAt || undefined,
          finishedAt: (matchesCall && phone.state.endedAt) || finishedAt,
          dialedPhone: selectedPhone || nextAppointment.phone,
        },
        { instance, token },
      );
      if (authScope.current.instance !== instance || authScope.current.userId !== user?.CODIGO)
        return;
      setIsDrawerOpen(false);
      await reloadQueue();
      toast.success("Atendimento telefonico finalizado com sucesso.");
    } catch (err) {
      toast.error(`Falha ao finalizar atendimento: ${sanitizeErrorMessage(err)}`);
      throw err;
    }
  };

  const handleOpenFinishModal = () => {
    if (!nextAppointment) return;

    openModal(
      <TelephoneFinishModal
        appointment={nextAppointment}
        onConfirm={handleFinishAppointment}
        onCheckConfirmation={async (operationId) => {
          if (
            !token ||
            authScope.current.instance !== instance ||
            authScope.current.userId !== user?.CODIGO
          )
            throw new Error("Reabra a fila na sessão atual.");
          const response = await customersService.getTelephonyFinishStatus(
            nextAppointment.id,
            operationId,
            { instance, token },
          );
          if (authScope.current.instance !== instance || authScope.current.userId !== user?.CODIGO)
            throw new Error("A sessão mudou. Releia a fila.");
          if (response.data.status === "applied") {
            setIsDrawerOpen(false);
            await reloadQueue();
            toast.success("Finalização confirmada. A fila foi atualizada.");
          }
          return response.data.status;
        }}
      />,
    );
  };

  const handleOpenDrawer = () => {
    if (!nextAppointment) return;
    setIsDrawerOpen(true);
  };

  if (isLoadingQueue) {
    return (
      <section
        aria-label="Próxima ligação"
        className="ip-attendance-next-call attendance-next-call attendance-next-call-summary"
        role="status"
      >
        <h2>Próxima ligação</h2>
        <span>Carregando…</span>
      </section>
    );
  }

  if (queueError) {
    return (
      <section
        data-queue-state="error"
        aria-label="Próxima ligação"
        className="ip-attendance-next-call attendance-next-call attendance-next-call-error"
      >
        <div>
          <h2>Próxima ligação</h2>
          <p role="status">{queueError}</p>
        </div>
        <Button size="small" color="error" onClick={() => void reloadQueue()}>
          Tentar novamente
        </Button>
      </section>
    );
  }

  if (!nextAppointment) {
    return (
      <section
        aria-label="Próxima ligação"
        className="ip-attendance-next-call attendance-next-call attendance-next-call-summary"
      >
        <h2>Próxima ligação</h2>
        <span>Sem pendências</span>
      </section>
    );
  }

  return (
    <>
      <button
        type="button"
        className="ip-attendance-next-call attendance-next-call attendance-next-call-open"
        aria-label={`Abrir próxima ligação: ${nextAppointment.contactName}`}
        onClick={handleOpenDrawer}
      >
        <span className="attendance-next-call-copy">
          <span className="attendance-next-call-label">
            Próxima ligação{matchesCall ? ` · ${callStatusLabel}` : ""}
          </span>
          <strong title={nextAppointment.contactName}>{nextAppointment.contactName}</strong>
          {nextAppointment.customerName &&
            nextAppointment.customerName !== nextAppointment.contactName && (
              <span className="attendance-next-call-customer" title={nextAppointment.customerName}>
                {nextAppointment.customerName}
              </span>
            )}
          <span className="attendance-next-call-meta" title={nextAppointment.campaignName}>
            {nextAppointment.campaignName} · #{nextAppointment.campaignClientId}
          </span>
        </span>
        <UiIcon icon={ChevronRight} scale="row" />
      </button>

      <TelephoneAttendanceDrawer
        open={isDrawerOpen}
        appointment={nextAppointment}
        isDialing={isDialing || isStartingDial}
        callStatusLabel={callStatusLabel}
        canStartCall={phone.state.connection === "ready" && !phone.busy && !isStartingDial}
        canFinish={!phone.busy && !isStartingDial}
        dialedPhone={selectedPhone || nextAppointment.phone}
        onClose={() => setIsDrawerOpen(false)}
        onSelectPhone={setSelectedPhone}
        onStartDial={handleStartDial}
        onOpenFinishModal={handleOpenFinishModal}
      />
    </>
  );
}
