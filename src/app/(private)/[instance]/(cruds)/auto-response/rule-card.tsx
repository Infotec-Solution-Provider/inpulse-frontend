"use client";
import { Tooltip, IconButton, Switch } from "@mui/material";
import { Edit, Trash2, Globe, Users, Clock } from "lucide-react";
import { useAutoResponseContext } from "./auto-response.context";
import { AutomaticResponseRule } from "@/lib/sdk-local";

export default function RuleCard({ rule }: { rule: AutomaticResponseRule }) {
  const { openRuleModal, handleDeleteRule, updateRule } = useAutoResponseContext();
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = event.target.checked;

    const ruleData: any = {
      name: rule.name,
      message: rule.message,
      isEnabled,
      isGlobal: rule.isGlobal,
      cooldownSeconds: (rule as any).cooldownSeconds ?? 3600,
      fileId: (rule as any).fileId ?? null,
      userIds: (rule.userAssignments || []).map((u: any) => u.userId),
      schedules: (rule.schedules || []).map((s: any) => ({
        frequency: s.frequency || "WEEKLY",
        daysOfWeek: Array.isArray(s.daysOfWeek)
          ? s.daysOfWeek
          : s.dayOfWeek !== undefined && s.dayOfWeek !== null
            ? [s.dayOfWeek]
            : undefined,
        dayOfMonth: s.dayOfMonth ?? null,
        month: s.month ?? null,
        startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : null,
        endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : null,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone || "America/Fortaleza",
      })),
    };

    await updateRule((rule as any).id, ruleData);
  };

  const scheduleBadge = () => {
    if (!rule.schedules || rule.schedules.length === 0) return "Nenhum horário definido";
    const parts: string[] = [];

    for (const s of rule.schedules as any[]) {
      const freq = s.frequency || "WEEKLY";
      if (freq === "DAILY") {
        parts.push(`Diário ${s.startTime}-${s.endTime}`);
      } else if (freq === "WEEKLY") {
        const dw: number[] = Array.isArray(s.daysOfWeek)
          ? s.daysOfWeek
          : s.dayOfWeek !== undefined && s.dayOfWeek !== null
            ? [s.dayOfWeek]
            : [];
        const days = dw.map((d) => daysOfWeek[d]).join(",");
        parts.push(`Semanal (${days || "—"}) ${s.startTime}-${s.endTime}`);
      } else if (freq === "MONTHLY") {
        parts.push(`Mensal (dia ${s.dayOfMonth}) ${s.startTime}-${s.endTime}`);
      } else if (freq === "YEARLY") {
        parts.push(
          `Anual (${s.dayOfMonth} ${months[(s.month || 1) - 1]}) ${s.startTime}-${s.endTime}`,
        );
      } else if (freq === "ONCE") {
        const d = s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : "?";
        parts.push(`Única (${d}) ${s.startTime}-${s.endTime}`);
      }
    }
    return parts.join(" • ");
  };

  return (
    <div className="ip-crud-record grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-[var(--ip-text)]">{rule.name}</h3>
          <Switch
            inputProps={{ "aria-label": `Ativar ${rule.name}` }}
            checked={(rule as any).isEnabled}
            onChange={handleToggle}
            color="primary"
          />
        </div>

        <p className="mt-2 line-clamp-2 h-10 text-sm text-[var(--ip-muted)]">{rule.message}</p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            {rule.isGlobal ? (
              <Globe className="h-5 w-5 text-sky-500" />
            ) : (
              <Users className="h-5 w-5 text-teal-500" />
            )}
            <span className="font-medium text-[var(--ip-text)]">
              {rule.isGlobal
                ? "Global (para todos)"
                : `${(rule.userAssignments || []).length} Usuário(s)`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-5 w-5 text-amber-500" />
            <span className="font-medium text-[var(--ip-text)]">{scheduleBadge()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Tooltip title="Editar Regra">
          <IconButton aria-label="Editar regra" onClick={() => openRuleModal(rule)} size="small">
            <Edit className="h-5 w-5" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excluir Regra">
          <IconButton
            aria-label="Excluir regra"
            onClick={() => handleDeleteRule(rule)}
            size="small"
            sx={{ color: "error.main" }}
          >
            <Trash2 className="h-5 w-5" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
