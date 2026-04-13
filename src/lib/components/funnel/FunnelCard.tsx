"use client";
import { FunnelCard as IFunnelCard } from "@/lib/types/funnel.types";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CampaignIcon from "@mui/icons-material/Campaign";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { useParams, useRouter } from "next/navigation";

interface Props {
  card: IFunnelCard;
}

function formatDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function relativeDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 30) return `há ${diff} dias`;
  if (diff < 365) return `há ${Math.floor(diff / 30)} meses`;
  return `há ${Math.floor(diff / 365)} anos`;
}

export default function FunnelCard({ card }: Props) {
  const router = useRouter();
  const params = useParams();
  const instance = params["instance"] as string;

  const handleClick = () => {
    router.push(`/${instance}/customers?search=${encodeURIComponent(card.nome)}`);
  };

  return (
    <button
      onClick={handleClick}
      className="group w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      {/* Name row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <PersonIcon className="shrink-0 text-slate-400" style={{ fontSize: 13 }} />
          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {card.nome}
          </span>
        </div>
        {card.totalContatos > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            <ChatBubbleOutlineIcon style={{ fontSize: 10 }} />
            {card.totalContatos > 99 ? "99+" : card.totalContatos}
          </span>
        )}
      </div>

      {/* Phone */}
      {card.fone1 && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <PhoneIcon style={{ fontSize: 11 }} />
          <span>{card.fone1}</span>
        </div>
      )}

      {/* Campaign */}
      {card.campanha && (
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <CampaignIcon style={{ fontSize: 11 }} />
          <span className="truncate">{card.campanha}</span>
        </div>
      )}

      {/* Operator */}
      {card.operador && (
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <SupportAgentIcon style={{ fontSize: 11 }} />
          <span className="truncate">{card.operador}</span>
        </div>
      )}

      {/* Scheduling */}
      {card.agendamento && (
        <div className="mt-1.5 flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
          <CalendarMonthIcon style={{ fontSize: 11 }} />
          <span>{formatDate(card.agendamento)}</span>
        </div>
      )}

      {/* Last contact */}
      {!card.agendamento && card.ultimoContato && (
        <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-600">
          {relativeDate(card.ultimoContato)}
        </div>
      )}
    </button>
  );
}
