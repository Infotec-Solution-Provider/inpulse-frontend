"use client";
import { Avatar } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SyncAltIcon from "@mui/icons-material/SyncAlt";

interface MonitorCardProps {
  type: "external-chat" | "internal-chat" | "internal-group" | "schedule" | "finished-chat";
  startDate?: string | null | false;
  endDate?: string | null | false;
  userName: string;
  sectorName: string;
  imageUrl?: string | null;
  chatTitle: string;
  customerName?: string | null;
  contactNumber?: string | null;
  customerDocument?: string | null;
  scheduledAt?: string | null;
  scheduledFor?: string | null;
  participants?: string[];
  groupName?: string | null;
  groupDescription?: string | null;
  isScheduled?: boolean;
  isFinished?: boolean;
  handleTransfer?: (() => void) | null;
  handleView?: (() => void) | null;
  handleFinish?: (() => void) | null;
}

export default function MonitorCard({
  type = "external-chat",
  startDate,
  endDate,
  userName,
  sectorName = "Suporte",
  imageUrl,
  chatTitle = "Diego Souza",
  customerName,
  contactNumber,
  customerDocument,
  scheduledAt = null,
  scheduledFor = null,
  isScheduled = false,
  participants,
  groupName,
  groupDescription,
  handleTransfer,
  handleView,
  handleFinish,
}: MonitorCardProps) {
  const colors = {
    "external-chat": "violet",
    "finished-chat": "pink",
    "internal-chat": "cyan",
    "internal-group": "green",
    schedule: "orange",
  };

  const types = {
    "external-chat": "Atendimento",
    "finished-chat": "Atendimento Finalizado",
    "internal-chat": "Conversa Interna",
    "internal-group": "Grupo Interno",
    schedule: "Agendamento",
  };

  const getBorder = (type: keyof typeof colors) => {
    return `border-${colors[type]}-500`;
  };

  const getBgColor = (type: keyof typeof colors) => {
    return `bg-${colors[type]}-700/5`;
  };

  const getTextColor = (type: keyof typeof colors) => {
    return `text-${colors[type]}-800 dark:text-${colors[type]}-200`;
  };

  return (
    <div className="mb-2 w-full rounded-md bg-slate-200 dark:bg-slate-800">
      <div className={`${getBgColor(type)} py-2 pl-2 pr-4 text-slate-700 dark:text-slate-200`}>
        <div className="flex gap-2">
          <div className={`w-48 border-l-[3px] ${getBorder(type)} px-2 text-xs`}>
            <span className={`font-bold ${getTextColor(type)} `}>{types[type]}</span>
            <span className="block">{startDate ? startDate : "Não Iniciado"}</span>
            <span className="block">{endDate ? endDate : startDate ? "Em andamento" : <br />}</span>
            <span className="block font-semibold text-indigo-800 dark:text-indigo-200">
              {" "}
              {sectorName && <>({sectorName}) </>}
              {userName || "N/A"}{" "}
            </span>
          </div>
          <Avatar
            alt={chatTitle}
            src={imageUrl || ""}
            sx={{ width: 72, height: 72 }}
            variant="square"
          />
          {(type === "external-chat" || type === "schedule" || type === "finished-chat") && (
            <div className="flex w-52 flex-col text-xs">
              <span className="text-md font-semibold">{chatTitle} </span>
              <span>{contactNumber || "N/A"}</span>
              {customerName && <span>{customerName}</span>}
              {customerDocument && <span>{customerDocument}</span>}
            </div>
          )}

          {type === "internal-chat" && (
            <div className="flex w-52 flex-col text-xs">
              <span className="text-md font-semibold">{chatTitle} </span>
            </div>
          )}
          {type === "internal-group" && (
            <div className="flex w-52 flex-col text-xs">
              <span className="text-md font-semibold">{groupName} </span>
              <p className="truncate">{groupDescription || "Sem descrição"}</p>
              <span>{participants?.length} participantes</span>
            </div>
          )}
          {isScheduled && (
            <div className="flex w-52 flex-col border-l border-slate-400 pl-2 text-xs">
              <span className="font-semibold">Agendado em</span>
              <span>{scheduledAt}</span>
              <span className="font-semibold">Agendado para</span>
              <span>{scheduledFor}</span>
            </div>
          )}
          <div className="ml-auto flex flex-col items-end">
            {handleView && (
              <button
                className="hover:scale-125 hover:opacity-75"
                onClick={handleView}
                title="Visualizar"
                aria-label="Visualizar"
              >
                <VisibilityIcon color="info" className="!text-sm" />
              </button>
            )}
            {handleTransfer && (
              <button
                className="hover:scale-125 hover:opacity-75"
                onClick={handleTransfer}
                title="Transferir"
                aria-label="Transferir"
              >
                <SyncAltIcon color="primary" className="!text-sm" />
              </button>
            )}
            {handleFinish && (
              <button
                className="hover:scale-125 hover:opacity-75"
                onClick={handleFinish}
                title="Finalizar"
                aria-label="Finalizar"
              >
                <AssignmentTurnedInIcon color="success" className="!text-sm" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div
        className={`hidden border-amber-500 border-cyan-500 border-green-500 border-orange-500 border-pink-500 border-violet-500 bg-amber-700/5 bg-cyan-700/5 bg-green-700/5 bg-orange-700/5 bg-pink-700/5 bg-violet-700/5 text-amber-800 text-cyan-800 text-green-800 text-orange-800 text-pink-800 text-violet-800 dark:text-amber-200 dark:text-cyan-200 dark:text-green-200 dark:text-orange-200 dark:text-pink-200 dark:text-violet-200 md:block`}
      ></div>
    </div>
  );
}
