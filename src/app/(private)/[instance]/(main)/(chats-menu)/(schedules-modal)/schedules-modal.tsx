import { useAuthContext } from "@/app/auth-context";
import CloseIcon from "@mui/icons-material/Close";
import { CircularProgress, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { DetailedSchedule, useWhatsappContext } from "../../../whatsapp-context";

interface Props {
  onClose: () => void;
}

export default function SchedulesModal({ onClose }: Props) {
  const { wppApi } = useWhatsappContext();
  const { user } = useAuthContext();
  const [schedules, setSchedules] = useState<DetailedSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDateTime = (s: string) => {
    const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!wppApi.current || !user) return;
      setLoading(true);
      try {
        const res = await wppApi.current.getSchedules(String(user.CODIGO), String(user.SETOR), {
          perPage: "999",
        });
        console.log(res.data);
        if (!mounted) return;

        const list = (res.data as DetailedSchedule[]).slice().sort((a, b) => {
          const da = new Date(
            a.scheduleDate.includes("T") ? a.scheduleDate : a.scheduleDate.replace(" ", "T"),
          ).getTime();
          const db = new Date(
            b.scheduleDate.includes("T") ? b.scheduleDate : b.scheduleDate.replace(" ", "T"),
          ).getTime();
          return da - db;
        });

        setSchedules(list);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user, wppApi]);

  return (
    <div className="w-[40rem] rounded-md bg-slate-100 px-4 py-4 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-semibold text-lg">Meus Agendamentos</h1>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircularProgress size={24} />
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Nenhum agendamento encontrado.
          </div>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="rounded-md border border-slate-300 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">ID #{s.id}</div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Agendado para: {formatDateTime(s.scheduleDate)}
                  </div>
                </div>

                <div className="mb-1 text-sm">
                  <span className="font-medium">Contato: </span>
                  <span>{s.contact?.name || "—"}</span>
                  {s.contact?.phone ? (
                    <span className="text-slate-500"> • {s.contact.phone}</span>
                  ) : null}
                </div>

                <div className="mb-1 text-sm">
                  <span className="font-medium">Cliente: </span>
                  <span>
                    {(s as any)?.customer?.RAZAO || (s as any)?.customer?.FANTASIA || "—"}
                  </span>
                </div>

                {s.description ? (
                  <div className="mb-2 text-sm">
                    <span className="font-medium">Descrição: </span>
                    <span className="whitespace-pre-wrap">{s.description}</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
