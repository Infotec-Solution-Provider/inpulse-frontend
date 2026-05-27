'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTables, createMetric } from '@/lib/reports/api';
import { TableMeta } from '@/types/reports';
import Button from '@mui/material/Button';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';

const STEPS = ['Nome', 'Fonte de dados', 'Agregação', 'Visualização', 'Revisão'];

const AGGREGATIONS = ['count', 'sum', 'avg', 'min', 'max', 'count_distinct'];
const VIZ_TYPES = [
  { value: 'bar', label: 'Gráfico de Barras' },
  { value: 'line', label: 'Gráfico de Linha' },
  { value: 'pie', label: 'Gráfico de Pizza' },
  { value: 'table', label: 'Tabela' },
  { value: 'card', label: 'Card (KPI)' },
];

export default function NewMetricPage() {
  const { instance } = useParams<{ instance: string }>();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tableName, setTableName] = useState('');
  const [column, setColumn] = useState('');
  const [aggregation, setAggregation] = useState('count');
  const [groupBy, setGroupBy] = useState('');
  const [vizType, setVizType] = useState('bar');

  useEffect(() => {
    getTables()
      .then(setTables)
      .finally(() => setLoading(false));
  }, []);

  const selectedTable = tables.find((t) => t.name === tableName);
  const numericCols = selectedTable?.columns.filter((c) => c.numeric) ?? [];
  const allCols = selectedTable?.columns ?? [];

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return !!tableName && !!column;
    if (step === 2) return !!aggregation;
    if (step === 3) return !!vizType;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    await createMetric({
      name: name.trim(),
      description: description.trim() || undefined,
      tableName,
      column,
      aggregation: aggregation as never,
      groupBy: groupBy || undefined,
      visualizationType: vizType as never,
    });
    setSaving(false);
    router.push(`/${instance}/reports/metrics`);
  };

  if (loading) {
    return <div className="flex justify-center mt-24"><CircularProgress /></div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Typography variant="h5" fontWeight={700} mb={4}>Nova Métrica</Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      <div className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <TextField
              label="Nome da métrica"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </>
        )}

        {step === 1 && (
          <>
            <TextField
              select
              label="Tabela"
              value={tableName}
              onChange={(e) => { setTableName(e.target.value); setColumn(''); setGroupBy(''); }}
              fullWidth
            >
              {tables.map((t) => (
                <MenuItem key={t.name} value={t.name}>
                  {t.label} ({t.name})
                </MenuItem>
              ))}
            </TextField>

            {tableName && (
              <TextField
                select
                label="Coluna a agregar"
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                fullWidth
                helperText="Colunas numéricas recomendadas para sum/avg"
              >
                {(aggregation === 'count' || aggregation === 'count_distinct' ? allCols : numericCols.length ? numericCols : allCols).map((c) => (
                  <MenuItem key={c.name} value={c.name}>
                    {c.name} {c.numeric ? '(numérico)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <TextField
              select
              label="Agregação"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              fullWidth
            >
              {AGGREGATIONS.map((a) => (
                <MenuItem key={a} value={a}>{a.toUpperCase()}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Agrupar por (opcional)"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Sem agrupamento</MenuItem>
              {allCols.map((c) => (
                <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>
              ))}
            </TextField>
          </>
        )}

        {step === 3 && (
          <TextField
            select
            label="Tipo de visualização"
            value={vizType}
            onChange={(e) => setVizType(e.target.value)}
            fullWidth
          >
            {VIZ_TYPES.map((v) => (
              <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
            ))}
          </TextField>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-2">
            <Typography variant="body1"><strong>Nome:</strong> {name}</Typography>
            {description && <Typography variant="body1"><strong>Descrição:</strong> {description}</Typography>}
            <Typography variant="body1"><strong>Tabela:</strong> {tableName}</Typography>
            <Typography variant="body1"><strong>Coluna:</strong> {column}</Typography>
            <Typography variant="body1"><strong>Agregação:</strong> {aggregation.toUpperCase()}</Typography>
            {groupBy && <Typography variant="body1"><strong>Agrupar por:</strong> {groupBy}</Typography>}
            <Typography variant="body1"><strong>Visualização:</strong> {VIZ_TYPES.find(v => v.value === vizType)?.label}</Typography>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button
          onClick={() => (step === 0 ? router.push(`/${instance}/reports/metrics`) : setStep((s) => s - 1))}
          disabled={saving}
        >
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
          >
            Próximo
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleFinish}
            disabled={saving}
          >
            {saving ? <CircularProgress size={18} /> : 'Salvar Métrica'}
          </Button>
        )}
      </div>
    </div>
  );
}
