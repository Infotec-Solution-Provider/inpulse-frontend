"use client";

import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  IconButton, Switch, FormControlLabel, Select, MenuItem, OutlinedInput,
  Box, Chip, InputLabel, FormControl, Typography, Autocomplete
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

  // controla abrir/fechar o dropdown do Autocomplete
  const [userPickerOpen, setUserPickerOpen] = useState(false);

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

  const userOptions = useMemo(() => {
    return users.map((u: any) => ({ id: u.CODIGO, label: u.NOME || String(u.CODIGO) }));
  }, [users]);

  const selectedUserOptions = useMemo(
    () => userOptions.filter(o => selectedUserIds.includes(o.id)),
    [userOptions, selectedUserIds]
  );

  return (
    <Dialog
      open={true}
      onClose={closeModal}
      fullWidth
      maxWidth="md"
      PaperProps={{
        className:
          "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xl shadow-slate-900/10 dark:shadow-black/30",
        sx: {
          backgroundImage: "none",
        }
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
        <IconButton onClick={closeModal} size="small" aria-label="Fechar">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}
          className="border-slate-300 dark:border-slate-700"
        >
          <TextField
            size="small"
            label="Nome da Regra"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            required
          />

          <TextField
            size="small"
            label="Mensagem Automática"
            value={message}
            onChange={e => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormControlLabel
              control={<Switch size="small" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} />}
              label="Regra Ativa"
            />
            <FormControlLabel
              control={<Switch size="small" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />}
              label="Aplicar a todos (Global)"
            />
          </div>

          {!isGlobal && (
            <Autocomplete
              multiple
              size="small"
              open={userPickerOpen}
              onOpen={() => setUserPickerOpen(true)}
              onClose={() => setUserPickerOpen(false)}
              options={userOptions}
              value={selectedUserOptions}
              disableCloseOnSelect={false}
              filterSelectedOptions
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(_, newValue) => setSelectedUserIds(newValue.map(v => v.id))}
              ListboxProps={{ style: { maxHeight: 380, overflow: "auto" } }} // mantém dropdown compacto
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option.label} {...getTagProps({ index })} key={option.id} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Usuários (filtrar por nome)"
                  placeholder="Digite para filtrar..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {userPickerOpen && (
                          <IconButton
                            size="small"
                            aria-label="Fechar lista"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setUserPickerOpen(false)}
                          >
                            <X size={16} />
                          </IconButton>
                        )}
                        {params.InputProps.endAdornment}
                      </Box>
                    ),
                  }}
                />
              )}
              slotProps={{
                paper: {
                  sx: { maxHeight: 380 }
                }
              }}
            />
          )}

          <TextField
            size="small"
            label="Intervalo de Reenvio (segundos)"
            type="number"
            value={cooldownSeconds}
            onChange={e => setCooldownSeconds(Number(e.target.value))}
            fullWidth
            required
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">Recorrência / Horários de Ativação</h4>
              <Button size="small" startIcon={<Plus size={14} />} onClick={handleAddSchedule}>Adicionar</Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {schedules.map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 rounded border border-slate-300 dark:border-slate-700"
                >
                  <FormControl className="md:col-span-3" size="small">
                    <InputLabel id={`freq-${i}`}>Periodicidade</InputLabel>
                    <Select
                      labelId={`freq-${i}`}
                      value={s.frequency}
                      label="Periodicidade"
                      onChange={e => handleScheduleChange(i, { frequency: e.target.value as Frequency })}
                      fullWidth
                      size="small"
                      MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                    >
                      <MenuItem value="DAILY">Diária</MenuItem>
                      <MenuItem value="WEEKLY">Semanal</MenuItem>
                      <MenuItem value="MONTHLY">Mensal</MenuItem>
                      <MenuItem value="YEARLY">Anual</MenuItem>
                      <MenuItem value="ONCE">Única (data específica)</MenuItem>
                    </Select>
                  </FormControl>

                  {s.frequency === 'WEEKLY' && (
                    <FormControl className="md:col-span-4" size="small">
                      <InputLabel id={`dow-${i}`}>Dias da semana</InputLabel>
                      <Select
                        labelId={`dow-${i}`}
                        multiple
                        value={s.daysOfWeek || []}
                        onChange={e => handleScheduleChange(i, { daysOfWeek: e.target.value as number[] })}
                        input={<OutlinedInput label="Dias da semana" />}
                        renderValue={(selected) => (selected as number[]).map(v => daysOfWeekLabels[v]).join(', ')}
                        size="small"
                        MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
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
                      size="small"
                    />
                  )}

                  {s.frequency === 'YEARLY' && (
                    <>
                      <FormControl className="md:col-span-2" size="small">
                        <InputLabel id={`month-${i}`}>Mês</InputLabel>
                        <Select
                          labelId={`month-${i}`}
                          value={s.month ?? 1}
                          label="Mês"
                          onChange={e => handleScheduleChange(i, { month: Number(e.target.value) })}
                          size="small"
                          MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
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
                        size="small"
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
                      size="small"
                    />
                  )}

                  <TextField
                    className="md:col-span-2"
                    label="Início"
                    type="time"
                    value={s.startTime}
                    onChange={e => handleScheduleChange(i, { startTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <TextField
                    className="md:col-span-2"
                    label="Fim"
                    type="time"
                    value={s.endTime}
                    onChange={e => handleScheduleChange(i, { endTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />

                  <FormControl className="md:col-span-3" size="small">
                    <InputLabel id={`tz-${i}`}>Fuso Horário</InputLabel>
                    <Select
                      labelId={`tz-${i}`}
                      value={s.timezone || 'America/Fortaleza'}
                      label="Fuso Horário"
                      onChange={e => handleScheduleChange(i, { timezone: e.target.value as string })}
                      size="small"
                      MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                    >
                      <MenuItem value="America/Fortaleza">America/Fortaleza</MenuItem>
                      <MenuItem value="America/Sao_Paulo">America/Sao_Paulo</MenuItem>
                      <MenuItem value="UTC">UTC</MenuItem>
                    </Select>
                  </FormControl>

                  <div className="md:col-span-1 flex justify-end">
                    <IconButton onClick={() => handleRemoveSchedule(i)} color="error" size="small">
                      <Trash size={16} />
                    </IconButton>
                  </div>

                  {(s.frequency !== 'ONCE') && (
                    <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <TextField
                        label="Ativar a partir de (opcional)"
                        type="date"
                        value={s.startDate || ''}
                        onChange={e => handleScheduleChange(i, { startDate: e.target.value || null })}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                      <TextField
                        label="Desativar em (opcional)"
                        type="date"
                        value={s.endDate || ''}
                        onChange={e => handleScheduleChange(i, { endDate: e.target.value || null })}
                        InputLabelProps={{ shrink: true }}
                        size="small"
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

        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={closeModal} size="small">Cancelar</Button>
          <Button type="submit" variant="contained" size="small">
            {isEditMode ? 'Salvar Alterações' : 'Criar Regra'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
