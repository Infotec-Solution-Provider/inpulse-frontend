import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, IconButton, Switch, FormControlLabel, Select, MenuItem, OutlinedInput, Box, Chip, SelectChangeEvent } from "@mui/material";
import { X, Plus, Trash } from "lucide-react";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useAutoResponseContext } from "./auto-response.context";
import { AutomaticResponseRule, AutomaticResponseRuleDTO } from "@in.pulse-crm/sdk";
import useInternalChatContext from "../../internal-context";

interface RuleModalProps {
  rule?: AutomaticResponseRule;
}

export default function RuleModal({ rule }: RuleModalProps) {
    const { closeModal, createRule, updateRule } = useAutoResponseContext();
    const {users} = useInternalChatContext();
    const isEditMode = !!rule;

    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [isEnabled, setIsEnabled] = useState(true);
    const [isGlobal, setIsGlobal] = useState(true);
    const [cooldownSeconds, setCooldownSeconds] = useState(3600);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [schedules, setSchedules] = useState<{ dayOfWeek: number; startTime: string; endTime: string; }[]>([]);

    useEffect(() => {
        if (rule) {
            setName(rule.name);
            setMessage(rule.message);
            setIsEnabled(rule.isEnabled);
            setIsGlobal(rule.isGlobal);
            setCooldownSeconds(rule.cooldownSeconds);
            setSelectedUserIds(rule.userAssignments.map(u => u.userId));
            setSchedules(rule.schedules.map(s => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })));
        }
    }, [rule]);

    const handleAddSchedule = () => {
        setSchedules([...schedules, { dayOfWeek: 1, startTime: '18:00', endTime: '23:59' }]);
    };

    const handleRemoveSchedule = (index: number) => {
        setSchedules(schedules.filter((_, i) => i !== index));
    };

    const handleScheduleChange = (index: number, field: string, value: any) => {
        const newSchedules = [...schedules];
        (newSchedules[index] as any)[field] = value;
        setSchedules(newSchedules);
    };

    const handleUserChange = (event: SelectChangeEvent<typeof selectedUserIds>) => {
        const { target: { value } } = event;
        setSelectedUserIds(
            typeof value === 'string' ? value.split(',').map(Number) : value,
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !message.trim()) {
            toast.error("Nome e Mensagem são obrigatórios.");
            return;
        }

        const ruleData: AutomaticResponseRuleDTO = {
            name,
            message,
            isEnabled,
            isGlobal,
            cooldownSeconds: Number(cooldownSeconds),
            userIds: isGlobal ? [] : selectedUserIds,
            schedules,
            fileId: rule?.fileId || null
        };

        if (isEditMode) {
            await updateRule(rule.id, ruleData);
        } else {
            await createRule(ruleData);
        }
    };

    const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    return (
        <Dialog open={true} onClose={closeModal} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEditMode ? 'Editar Regra' : 'Criar Nova Regra'}
                <IconButton onClick={closeModal}><X /></IconButton>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 3 }}>
                    <TextField label="Nome da Regra" value={name} onChange={e => setName(e.target.value)} fullWidth required />
                    <TextField label="Mensagem Automática" value={message} onChange={e => setMessage(e.target.value)} fullWidth multiline rows={3} required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormControlLabel control={<Switch checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} />} label="Regra Ativa" />
                        <FormControlLabel control={<Switch checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />} label="Aplicar a todos (Global)" />
                    </div>

                    {!isGlobal && (
                        <Select
                            multiple
                            fullWidth
                            value={selectedUserIds}
                            onChange={handleUserChange}
                            input={<OutlinedInput label="Usuários" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((id) => {
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
                    )}
                    <TextField label="Intervalo de Reenvio (segundos)" type="number" value={cooldownSeconds} onChange={e => setCooldownSeconds(Number(e.target.value))} fullWidth required />

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">Horários de Ativação</h4>
                            <Button startIcon={<Plus size={16}/>} onClick={handleAddSchedule}>Adicionar</Button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {schedules.map((s, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                                    <Select value={s.dayOfWeek} onChange={e => handleScheduleChange(i, 'dayOfWeek', e.target.value)} fullWidth>
                                        {daysOfWeek.map((day, dayIndex) => <MenuItem key={dayIndex} value={dayIndex}>{day}</MenuItem>)}
                                    </Select>
                                    <TextField type="time" value={s.startTime} onChange={e => handleScheduleChange(i, 'startTime', e.target.value)} fullWidth />
                                    <TextField type="time" value={s.endTime} onChange={e => handleScheduleChange(i, 'endTime', e.target.value)} fullWidth />
                                    <IconButton onClick={() => handleRemoveSchedule(i)} color="error"><Trash size={20}/></IconButton>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
                <DialogActions sx={{ padding: '16px 24px' }}>
                    <Button onClick={closeModal}>Cancelar</Button>
                    <Button type="submit" variant="contained">{isEditMode ? 'Salvar Alterações' : 'Criar Regra'}</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
