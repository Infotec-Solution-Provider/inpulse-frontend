"use client";
import { Avatar, Tooltip, IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PhoneIcon from "@mui/icons-material/Phone";
import BusinessIcon from "@mui/icons-material/Business";
import GroupIcon from "@mui/icons-material/Group";

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
  const typeConfig = {
    "external-chat": {
      borderColor: "border-l-blue-600",
      bgColor: "bg-blue-50/40 dark:bg-blue-950/10",
      labelColor: "text-blue-700 dark:text-blue-400",
      label: "Atendimento",
    },
    "finished-chat": {
      borderColor: "border-l-gray-500",
      bgColor: "bg-gray-50/40 dark:bg-gray-950/10",
      labelColor: "text-gray-700 dark:text-gray-400",
      label: "Finalizado",
    },
    "internal-chat": {
      borderColor: "border-l-indigo-600",
      bgColor: "bg-indigo-50/40 dark:bg-indigo-950/10",
      labelColor: "text-indigo-700 dark:text-indigo-400",
      label: "Conversa Interna",
    },
    "internal-group": {
      borderColor: "border-l-teal-600",
      bgColor: "bg-teal-50/40 dark:bg-teal-950/10",
      labelColor: "text-teal-700 dark:text-teal-400",
      label: "Grupo Interno",
    },
    schedule: {
      borderColor: "border-l-amber-600",
      bgColor: "bg-amber-50/40 dark:bg-amber-950/10",
      labelColor: "text-amber-700 dark:text-amber-400",
      label: "Agendamento",
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} mb-3 w-full rounded-lg border border-l-8 border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-slate-800`}
    >
      <div className={`rounded-s-md py-2 pl-2 pr-4`}>
        <div className="flex gap-3">
          <div className="w-44 px-2 text-xs">
            <span className={`font-semibold ${config.labelColor}`}>{config.label}</span>
            <span className="mt-1 block text-gray-600 dark:text-gray-400">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Início:</span>{" "}
              {startDate ? startDate : "Não Iniciado"}
            </span>
            {endDate && (
              <span className="block text-gray-600 dark:text-gray-400">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Fim:</span>{" "}
                {endDate}
              </span>
            )}
            <span className="mt-2 block border-t border-gray-200 pt-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200">
              {userName || "N/A"}
            </span>
            {sectorName && (
              <span className="block text-xs text-gray-600 dark:text-gray-400">{sectorName}</span>
            )}
          </div>
          <Avatar
            alt={chatTitle}
            src={imageUrl || ""}
            sx={{
              width: 64,
              height: 64,
              border: "2px solid rgb(229, 231, 235)",
            }}
          />
          {(type === "external-chat" || type === "schedule" || type === "finished-chat") && (
            <div className="flex flex-1 flex-col gap-1 text-xs">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{chatTitle}</h3>
              {contactNumber && (
                <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <PhoneIcon sx={{ fontSize: 14 }} />
                  {contactNumber}
                </p>
              )}
              {customerName && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <BusinessIcon sx={{ fontSize: 14 }} />
                  {customerName}
                </p>
              )}
              {customerDocument && <p className="text-xs text-gray-500">{customerDocument}</p>}
            </div>
          )}

          {type === "internal-chat" && (
            <div className="flex flex-1 flex-col gap-1 text-xs">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{chatTitle}</h3>
            </div>
          )}
          {type === "internal-group" && (
            <div className="flex flex-1 flex-col gap-1 text-xs">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <GroupIcon sx={{ fontSize: 18 }} />
                {groupName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {groupDescription || "Sem descrição"}
              </p>
              <span className="text-xs text-gray-500">
                {participants?.length || 0} participantes
              </span>
            </div>
          )}
          {isScheduled && (
            <div className="flex flex-col border-l border-amber-200 pl-3 text-xs dark:border-amber-800">
              <div className="mb-1 flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                <AccessTimeIcon sx={{ fontSize: 14 }} />
                Agendamento
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500">
                    Agendado em:
                  </span>
                  <p className="font-medium text-gray-700 dark:text-gray-300">{scheduledAt}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500">Para:</span>
                  <p className="font-medium text-gray-700 dark:text-gray-300">{scheduledFor}</p>
                </div>
              </div>
            </div>
          )}
          <div className="ml-auto flex flex-col items-center gap-2">
            {handleView && (
              <Tooltip title="Visualizar" arrow placement="left">
                <IconButton
                  onClick={handleView}
                  size="small"
                  sx={{
                    border: "1px solid rgb(229, 231, 235)",
                    "&:hover": {
                      borderColor: "rgb(59, 130, 246)",
                      backgroundColor: "rgb(239, 246, 255)",
                    },
                  }}
                >
                  <VisibilityIcon sx={{ fontSize: 18, color: "rgb(59, 130, 246)" }} />
                </IconButton>
              </Tooltip>
            )}
            {handleTransfer && (
              <Tooltip title="Transferir" arrow placement="left">
                <IconButton
                  onClick={handleTransfer}
                  size="small"
                  sx={{
                    border: "1px solid rgb(229, 231, 235)",
                    "&:hover": {
                      borderColor: "rgb(99, 102, 241)",
                      backgroundColor: "rgb(238, 242, 255)",
                    },
                  }}
                >
                  <SyncAltIcon sx={{ fontSize: 18, color: "rgb(99, 102, 241)" }} />
                </IconButton>
              </Tooltip>
            )}
            {handleFinish && (
              <Tooltip title="Finalizar" arrow placement="left">
                <IconButton
                  onClick={handleFinish}
                  size="small"
                  sx={{
                    border: "1px solid rgb(229, 231, 235)",
                    "&:hover": {
                      borderColor: "rgb(34, 197, 94)",
                      backgroundColor: "rgb(240, 253, 244)",
                    },
                  }}
                >
                  <AssignmentTurnedInIcon sx={{ fontSize: 18, color: "rgb(34, 197, 94)" }} />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
