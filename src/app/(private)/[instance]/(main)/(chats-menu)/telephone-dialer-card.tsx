"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useAuthContext } from "@/app/auth-context";
import customersService from "@/lib/services/customers.service";
import { Formatter, sanitizeErrorMessage } from "@in.pulse-crm/utils";
import ScheduleIcon from "@mui/icons-material/Schedule";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Button, Chip } from "@mui/material";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import TelephoneAttendanceDrawer from "./telephone-attendance-drawer";
import TelephoneFinishModal from "./telephone-finish-modal";
import {
  mapTelephonyScheduleToQueueItem,
  TelephoneQueueItem,
} from "./telephone-dialer.types";

const formatPhone = (phone: string) => {
  try {
    return Formatter.phone(phone);
  } catch {
    return phone;
  }
};

const formatSchedule = (scheduledAt: string) => {
  const date = new Date(scheduledAt);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function TelephoneDialerCard() {
  const { token } = useAuthContext();
  const { openModal } = useAppContext();
  const [queue, setQueue] = useState<TelephoneQueueItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const nextAppointment = useMemo(() => queue[0] ?? null, [queue]);
  const isDialing = nextAppointment?.id === activeId;

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

  const handleStartDial = () => {
    if (!nextAppointment) return;

    setActiveId(nextAppointment.id);
    setStartedAt((currentStartedAt) => currentStartedAt || new Date().toISOString());
    setQueue((previousQueue) =>
      previousQueue.map((item) =>
        item.id === nextAppointment.id ? { ...item, status: "dialing" } : item,
      ),
    );
  };

  const handleFinishAppointment = async (resultId: number, scheduleDate?: string) => {
    if (!nextAppointment) return;

    if (!token) {
      throw new Error("Sessao invalida para finalizar atendimento.");
    }

    try {
      customersService.setAuth(token);
      await customersService.finishTelephonySchedule(nextAppointment.id, {
        resultId,
        scheduleDate,
        startedAt: startedAt || undefined,
        finishedAt: new Date().toISOString(),
        dialedPhone: selectedPhone || nextAppointment.phone,
      });
      setActiveId(null);
      setStartedAt(null);
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
      <TelephoneFinishModal appointment={nextAppointment} onConfirm={handleFinishAppointment} />,
    );
  };

  const handleOpenDrawer = () => {
    if (!nextAppointment) return;
    setIsDrawerOpen(true);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleOpenDrawer();
  };

  if (isLoadingQueue) {
    return (
      <section className="mx-3 mb-3 rounded-md border border-slate-300 bg-white/70 px-3 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Discagem</h2>
            <p className="mt-1 text-xs">Carregando fila telefonica...</p>
          </div>
          <Chip size="small" label="Sincronizando" color="info" />
        </div>
      </section>
    );
  }

  if (queueError) {
    return (
      <section className="mx-3 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Discagem</h2>
            <p className="mt-1 text-xs leading-5">{queueError}</p>
          </div>
          <Button size="small" variant="outlined" color="error" onClick={() => void reloadQueue()}>
            Tentar novamente
          </Button>
        </div>
      </section>
    );
  }

  if (!nextAppointment) {
    return (
      <section className="mx-3 mb-3 rounded-md border border-dashed border-slate-400/70 bg-slate-300/60 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-200">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Discagem</h2>
          <Chip size="small" label="Fila vazia" color="default" />
        </div>
        <p className="mt-1 text-xs leading-5">
          Nenhum agendamento pendente. O proximo item de campanhas_clientes aparecera aqui.
        </p>
      </section>
    );
  }

  return (
    <>
      <section
        className="mx-3 mb-3 cursor-pointer rounded-md border border-slate-300 bg-white/70 px-3 py-2.5 text-slate-800 shadow-sm backdrop-blur transition hover:border-slate-400 hover:shadow-md dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:hover:border-slate-500"
        role="button"
        tabIndex={0}
        onClick={handleOpenDrawer}
        onKeyDown={handleCardKeyDown}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Proxima ligacao
              </p>
              <Chip
                size="small"
                color={isDialing ? "success" : "warning"}
                label={isDialing ? "Em discagem" : "Não iniciado"}
                className="!h-5"
              />
            </div>
            <h2 className="mt-1 truncate text-sm font-semibold sm:text-base">
              {nextAppointment.contactName}
            </h2>
            <p className="truncate text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
              {nextAppointment.customerName || "Cliente nao vinculado"}
            </p>
          </div>
          <KeyboardArrowRightIcon className="mt-1 text-slate-400" />
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
          <p className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 sm:text-xs">
            {nextAppointment.campaignName}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>#{nextAppointment.campaignClientId}</span>
          <span>Clique para abrir atendimento</span>
        </div>
      </section>

      <TelephoneAttendanceDrawer
        open={isDrawerOpen}
        appointment={nextAppointment}
        isDialing={isDialing}
        dialedPhone={selectedPhone || nextAppointment.phone}
        onClose={() => setIsDrawerOpen(false)}
        onSelectPhone={setSelectedPhone}
        onStartDial={handleStartDial}
        onOpenFinishModal={handleOpenFinishModal}
      />
    </>
  );
}