"use client";
import { Stack, TextField, MenuItem, Typography } from "@mui/material";
import type { SurveyQuestion } from "@/lib/satisfaction";
export default function TelephoneSurveyFields({
  questions,
  answers,
  onChange,
  disabled = false,
}: {
  questions: SurveyQuestion[];
  answers: Record<number, string>;
  onChange: (id: number, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Stack spacing={2} role="group" aria-label="Pesquisa da ligação">
      <Typography variant="subtitle1">Pesquisa da ligação</Typography>
      {questions.map((q) => (
        <Stack key={q.id} spacing={1}>
          <Typography id={`survey-question-${q.id}`} sx={{ overflowWrap: "anywhere" }}>
            {q.description}
          </Typography>
          <TextField
            select
            fullWidth
            required
            label={`Avaliação ${q.id}`}
            value={answers[q.id] ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(q.id, e.target.value)}
            slotProps={{ select: { "aria-describedby": `survey-question-${q.id}` } }}
          >
            <MenuItem value="5">5 — Muito bom</MenuItem>
            <MenuItem value="4">4 — Bom</MenuItem>
            <MenuItem value="3">3 — Regular</MenuItem>
            <MenuItem value="2">2 — Ruim</MenuItem>
            <MenuItem value="1">1 — Péssimo</MenuItem>
            <MenuItem value="none">Nenhum</MenuItem>
          </TextField>
        </Stack>
      ))}
    </Stack>
  );
}
