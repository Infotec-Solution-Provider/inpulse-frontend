"use client";
import { Tooltip, IconButton, Switch } from "@mui/material";
import { Edit, Trash2, Globe, Users, Clock } from "lucide-react";
import { useAutoResponseContext } from "./auto-response.context";
import { AutomaticResponseRule } from "@in.pulse-crm/sdk";

export default function RuleCard({ rule }: { rule: AutomaticResponseRule }) {
    const { openRuleModal, handleDeleteRule, updateRule } = useAutoResponseContext();
    const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const isEnabled = event.target.checked;
        const ruleData = {
            name: rule.name,
            message: rule.message,
            isEnabled: isEnabled,
            isGlobal: rule.isGlobal,
            cooldownSeconds: rule.cooldownSeconds,
            fileId: rule.fileId,
            userIds: rule.userAssignments.map(u => u.userId),
            schedules: rule.schedules.map(s => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }))
        };
        await updateRule(rule.id, ruleData);
    };

    const getScheduleSummary = () => {
        if (!rule.schedules || rule.schedules.length === 0) {
            return "Nenhum horário definido";
        }
        const uniqueDays = [...new Set(rule.schedules.map(s => s.dayOfWeek))].sort();
        return uniqueDays.map(d => daysOfWeek[d]).join(', ');
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden flex flex-col transition-all hover:shadow-lg">
            <div className="p-6 flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                    <Switch checked={rule.isEnabled} onChange={handleToggle} color="primary" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 h-10">{rule.message}</p>

                <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        {rule.isGlobal ? <Globe className="w-5 h-5 text-sky-500" /> : <Users className="w-5 h-5 text-teal-500" />}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                            {rule.isGlobal ? 'Global (para todos)' : `${rule.userAssignments.length} Usuário(s)`}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{getScheduleSummary()}</span>
                    </div>
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 flex justify-end items-center gap-2">
                <Tooltip title="Editar Regra">
                    <IconButton onClick={() => openRuleModal(rule)} size="small">
                        <Edit className="w-5 h-5" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Excluir Regra">
                    <IconButton onClick={() => handleDeleteRule(rule)} size="small" sx={{ color: 'error.main' }}>
                        <Trash2 className="w-5 h-5" />
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    );
}
