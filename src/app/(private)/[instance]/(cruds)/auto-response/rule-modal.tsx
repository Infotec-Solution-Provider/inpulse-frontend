"use client";

import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  IconButton, Switch, FormControlLabel, Select, MenuItem, OutlinedInput,
  Box, Chip, SelectChangeEvent, InputLabel, FormControl, Typography
} from "@mui/material";
import { X, Plus, Trash } from "lucide-react";
import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import { useAutoResponseContext } from "./auto-response.context";
import { AutomaticResponseRule } from "@in.pulse-crm/sdk";
import useInternalChatContext from "../../internal-context";

type Frequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface RuleModalProps {
  rule?: AutomaticResponseRule;
}

type UISchedule = {
  frequency: Frequency;
  // WEEKLY
  daysOfWeek?: number[];
  // MONTHLY / YEARLY
  dayOfMonth?: number | null;
  month?: number | null;
  // janela opcional
  startDate?: string | null;  // ISO yyyy-MM-dd
  endDate?: string | null;    // ISO yyyy-MM-dd
  // horário
  startTime: string;          // HH:mm
  endTime: string;            // HH:mm
  timezone?: string | null;
  // legado
  dayOfWeek?: number | null;
};

export default function RuleModal({ rule }: RuleModalProps) {
  const { closeModal, createRule, updateRule } = useAutoResponseContext();
  const { users } = useInternalChatContext();
  const isEditMode = !!rule;

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isGlobal, setIsGlobal] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(3600);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [schedules, setSchedules] = useState<UISchedule[]>([]);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setMessage(rule.message);
      setIsEnabled(rule.isEnabled);
      setIsGlobal(rule.isGlobal);
      setCooldownSeconds(rule.cooldownSeconds);
      setSelectedUserIds((rule.userAssignments || []).map((u: any) => u.userId));

      const mapped: UISchedule[] = (rule.schedules || []).map((s: any) => {
        const freq: Frequency = s.frequency || 'WEEKLY';
        let daysOfWeek: number[] | undefined = undefined;
        if (freq === 'WEEKLY') {
          daysOfWeek = Array.isArray(s.daysOfWeek)
            ? s.daysOfWeek
            : (s.dayOfWeek !== undefined && s.dayOfWeek !== null ? [s.dayOfWeek] : []);
        }
        return {
          frequency: freq,
          daysOfWeek,
          dayOfMonth: s.dayOfMonth ?? null,
          month: s.month ?? null,
          startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : null,
          endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : null,
          startTime: s.startTime,
          endTime: s.endTime,
          timezone: s.timezone || 'America/Fortaleza',
          dayOfWeek: s.dayOfWeek ?? null
        };
      });

      setSchedules(mapped.length ? mapped : [{
        frequency: 'WEEKLY',
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '23:59',
        timezone: 'America/Fortaleza',
        dayOfMonth: null,
        month: null,
        startDate: null,
        endDate: null
      }]);
    } else {
      setSchedules([{
        frequency: 'WEEKLY',
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '23:59',
        timezone: 'America/Fortaleza',
        dayOfMonth: null,
        month: null,
        startDate: null,
        endDate: null
      }]);
    }
  }, [rule]);

  const daysOfWeekLabels = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = useMemo(
    () => [
      { v: 1, n: "Jan" }, { v: 2, n: "Fev" }, { v: 3, n: "Mar" }, { v: 4, n: "Abr" },
      { v: 5, n: "Mai" }, { v: 6, n: "Jun" }, { v: 7, n: "Jul" }, { v: 8, n: "Ago" },
      { v: 9, n: "Set" }, { v: 10, n: "Out" }, { v: 11, n: "Nov" }, { v: 12, n: "Dez" }
    ],
    []
  );

  const handleAddSchedule = () => {
    setSchedules(prev => [...prev, {
      frequency: 'WEEKLY',
      daysOfWeek: [1],
      startTime: '18:00',
      endTime: '23:59',
      timezone: 'America/Fortaleza',
      dayOfMonth: null,
      month: null,
      startDate: null,
      endDate: null
    }]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index: number, patch: Partial<UISchedule>) => {
    const clone = [...schedules];
    clone[index] = { ...clone[index], ...patch };

    if (patch.frequency) {
      const f = patch.frequency;
      if (f === 'DAILY') {
        clone[index].daysOfWeek = undefined;
        clone[index].dayOfMonth = null;
        clone[index].month = null;
      } else if (f === 'WEEKLY') {
        clone[index].daysOfWeek = clone[index].daysOfWeek?.length ? clone[index].daysOfWeek : [1];
        clone[index].dayOfMonth = null;
        clone[index].month = null;
      } else if (f === 'MONTHLY') {
        clone[index].daysOfWeek = undefined;
        clone[index].dayOfMonth = clone[index].dayOfMonth ?? 1;
        clone[index].month = null;
      } else if (f === 'YEARLY') {
        clone[index].daysOfWeek = undefined;
        clone[index].dayOfMonth = clone[index].dayOfMonth ?? 1;
        clone[index].month = clone[index].month ?? 1;
      } else if (f === 'ONCE') {
        clone[index].startDate = clone[index].startDate ?? new Date().toISOString().slice(0, 10);
      }
    }

    setSchedules(clone);
  };

  const handleUserChange = (event: SelectChangeEvent<typeof selectedUserIds>) => {
    const { value } = event.target;
    setSelectedUserIds(typeof value === 'string' ? value.split(',').map(Number) : (value as number[]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Nome e Mensagem são obrigatórios.");
      return;
    }

    const normalized = schedules.map(s => {
      const dto: any = {
        frequency: s.frequency,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone || 'America/Fortaleza',
        startDate: s.startDate || null,
        endDate: s.endDate || null
      };
      if (s.frequency === 'WEEKLY') {
        dto.daysOfWeek = s.daysOfWeek && s.daysOfWeek.length ? s.daysOfWeek : undefined;
      } else if (s.frequency === 'MONTHLY') {
        dto.dayOfMonth = s.dayOfMonth ?? 1;
      } else if (s.frequency === 'YEARLY') {
        dto.dayOfMonth = s.dayOfMonth ?? 1;
        dto.month = s.month ?? 1;
      } else if (s.frequency === 'ONCE') {
        dto.startDate = s.startDate || new Date().toISOString().slice(0, 10);
      }
      return dto;
    });

    const payload: any = {
      name,
      message,
      isEnabled,
      isGlobal,
      cooldownSeconds: Number(cooldownSeconds),
      userIds: isGlobal ? [] : selectedUserIds,
      schedules: normalized,
      fileId: (rule as any)?.fileId ?? null
    };

    if (isEditMode) {
      await updateRule((rule as any).id, payload);
    } else {
      await createRule(payload);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={closeModal}
      fullWidth
      maxWidth="md"
      PaperProps={{
        className:
          "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xl shadow-slate-900/10 dark:shadow-black/30",
        sx: { backgroundImage: "none" }
      }}
      slotProps={{
        backdrop: {
          className: "bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
        }
      }}
      BackdropProps={{
        className: "bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
      }}
    >
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        {isEditMode ? "Editar Regra" : "Criar Nova Regra"}
        <IconButton onClick={closeModal}><X /></IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 3, padding: 3 }}
          className="border-slate-300 dark:border-slate-700"
        >
          <TextField label="Nome da Regra" value={name} onChange={e => setName(e.target.value)} fullWidth required />
          <TextField label="Mensagem Automática" value={message} onChange={e => setMessage(e.target.value)} fullWidth multiline rows={3} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormControlLabel control={<Switch checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} />} label="Regra Ativa" />
            <FormControlLabel control={<Switch checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />} label="Aplicar a todos (Global)" />
          </div>

          {!isGlobal && (
            <FormControl fullWidth>
              <InputLabel id="users-label">Usuários</InputLabel>
              <Select
                labelId="users-label"
                multiple
                value={selectedUserIds}
                onChange={handleUserChange}
                input={<OutlinedInput label="Usuários" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((id) => {
                      const user = users.find(u => u.CODIGO === id);
                      return <Chip key={id} label={user?.NOME || `ID: ${id}`} />;
                    })}
                  </Box>
                )}
              >
                <MenuItem disabled value="">
                  <em>Selecione os usuários</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.CODIGO} value={user.CODIGO}>
                    {user.NOME}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Intervalo de Reenvio (segundos)"
            type="number"
            value={cooldownSeconds}
            onChange={e => setCooldownSeconds(Number(e.target.value))}
            fullWidth
            required
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Recorrência / Horários de Ativação</h4>
              <Button startIcon={<Plus size={16} />} onClick={handleAddSchedule}>Adicionar</Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {schedules.map((s, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 rounded border border-slate-300 dark:border-slate-700">
                  <FormControl className="md:col-span-3">
                    <InputLabel id={`freq-${i}`}>Periodicidade</InputLabel>
                    <Select
                      labelId={`freq-${i}`}
                      value={s.frequency}
                      label="Periodicidade"
                      onChange={e => handleScheduleChange(i, { frequency: e.target.value as Frequency })}
                      fullWidth
                    >
                      <MenuItem value="DAILY">Diária</MenuItem>
                      <MenuItem value="WEEKLY">Semanal</MenuItem>
                      <MenuItem value="MONTHLY">Mensal</MenuItem>
                      <MenuItem value="YEARLY">Anual</MenuItem>
                      <MenuItem value="ONCE">Única (data específica)</MenuItem>
                    </Select>
                  </FormControl>

                  {s.frequency === 'WEEKLY' && (
                    <FormControl className="md:col-span-4">
                      <InputLabel id={`dow-${i}`}>Dias da semana</InputLabel>
                      <Select
                        labelId={`dow-${i}`}
                        multiple
                        value={s.daysOfWeek || []}
                        onChange={e => handleScheduleChange(i, { daysOfWeek: e.target.value as number[] })}
                        input={<OutlinedInput label="Dias da semana" />}
                        renderValue={(selected) => (selected as number[]).map(v => daysOfWeekLabels[v]).join(', ')}
                      >
                        {daysOfWeekLabels.map((d, idx) => (
                          <MenuItem key={idx} value={idx}>{d}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {s.frequency === 'MONTHLY' && (
                    <TextField
                      className="md:col-span-2"
                      label="Dia do mês"
                      type="number"
                      inputProps={{ min: 1, max: 31 }}
                      value={s.dayOfMonth ?? 1}
                      onChange={e => handleScheduleChange(i, { dayOfMonth: Number(e.target.value) })}
                    />
                  )}

                  {s.frequency === 'YEARLY' && (
                    <>
                      <FormControl className="md:col-span-2">
                        <InputLabel id={`month-${i}`}>Mês</InputLabel>
                        <Select
                          labelId={`month-${i}`}
                          value={s.month ?? 1}
                          label="Mês"
                          onChange={e => handleScheduleChange(i, { month: Number(e.target.value) })}
                        >
                          {months.map(m => <MenuItem key={m.v} value={m.v}>{m.n}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField
                        className="md:col-span-2"
                        label="Dia do mês"
                        type="number"
                        inputProps={{ min: 1, max: 31 }}
                        value={s.dayOfMonth ?? 1}
                        onChange={e => handleScheduleChange(i, { dayOfMonth: Number(e.target.value) })}
                      />
                    </>
                  )}

                  {s.frequency === 'ONCE' && (
                    <TextField
                      className="md:col-span-3"
                      label="Data (única)"
                      type="date"
                      value={s.startDate || ''}
                      onChange={e => handleScheduleChange(i, { startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}

                  <TextField
                    className="md:col-span-2"
                    label="Início"
                    type="time"
                    value={s.startTime}
                    onChange={e => handleScheduleChange(i, { startTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    className="md:col-span-2"
                    label="Fim"
                    type="time"
                    value={s.endTime}
                    onChange={e => handleScheduleChange(i, { endTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />

                  <FormControl className="md:col-span-3">
                    <InputLabel id={`tz-${i}`}>Fuso Horário</InputLabel>
                    <Select
                      labelId={`tz-${i}`}
                      value={s.timezone || 'America/Fortaleza'}
                      label="Fuso Horário"
                      onChange={e => handleScheduleChange(i, { timezone: e.target.value as string })}
                    >
                      <MenuItem value="America/Fortaleza">America/Fortaleza</MenuItem>
                      <MenuItem value="America/Sao_Paulo">America/Sao_Paulo</MenuItem>
                      <MenuItem value="UTC">UTC</MenuItem>
                    </Select>
                  </FormControl>

                  <div className="md:col-span-1 flex justify-end">
                    <IconButton onClick={() => handleRemoveSchedule(i)} color="error"><Trash size={20} /></IconButton>
                  </div>

                  {(s.frequency !== 'ONCE') && (
                    <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <TextField
                        label="Ativar a partir de (opcional)"
                        type="date"
                        value={s.startDate || ''}
                        onChange={e => handleScheduleChange(i, { startDate: e.target.value || null })}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Desativar em (opcional)"
                        type="date"
                        value={s.endDate || ''}
                        onChange={e => handleScheduleChange(i, { endDate: e.target.value || null })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Typography variant="caption" color="text.secondary" className="block mt-2">
              Dica: janelas que cruzam meia-noite são suportadas (ex.: 22:00 → 02:00).
            </Typography>
          </div>
        </DialogContent>

        <DialogActions
          sx={{ padding: "16px 24px" }}
        >
          <Button onClick={closeModal}>Cancelar</Button>
          <Button type="submit" variant="contained">{isEditMode ? 'Salvar Alterações' : 'Criar Regra'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
