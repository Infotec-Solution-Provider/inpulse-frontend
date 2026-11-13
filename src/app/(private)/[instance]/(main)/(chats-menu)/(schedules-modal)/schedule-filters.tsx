import {
  Autocomplete,
  Box,
  Button,
  Collapse,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  commercialOptions,
  periodOptions,
  repurchaseOptions,
  type ScheduleFilters,
} from "./schedule-query";

export type CampaignOption = { id: string; label: string };
export function ScheduleFilterFields({
  draft,
  setDraft,
  campaigns,
  channels,
  commercial,
}: {
  draft: ScheduleFilters;
  setDraft: (next: ScheduleFilters) => void;
  campaigns: CampaignOption[];
  channels: string[];
  commercial: boolean;
}) {
  const [advanced, setAdvanced] = useState(false);
  const update = <K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]) =>
    setDraft({ ...draft, [key]: value });
  const selectedCampaigns = draft.customerCampaignIds.map(
    (id) => campaigns.find((item) => item.id === id) ?? { id, label: `Campanha #${id}` },
  );
  return (
    <>
      <TextField
        label="Buscar agendamentos"
        placeholder="Cliente, contato, telefone, campanha ou origem"
        size="small"
        fullWidth
        value={draft.search}
        onChange={(event) => update("search", event.target.value)}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          mt: 1.5,
        }}
      >
        <TextField
          label="Período"
          size="small"
          select
          value={draft.period}
          onChange={(event) => update("period", event.target.value as ScheduleFilters["period"])}
        >
          {periodOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Canal"
          size="small"
          select
          value={draft.channels}
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
          onChange={(event) => update("channels", event.target.value)}
        >
          <MenuItem value="">Todos</MenuItem>
          {channels.map((channel) => (
            <MenuItem key={channel} value={channel}>
              {channel === "WHATSAPP" ? "WhatsApp" : "Telefonia"}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Ordenação"
          size="small"
          select
          value={draft.sortOrder}
          onChange={(event) =>
            update("sortOrder", event.target.value as ScheduleFilters["sortOrder"])
          }
        >
          <MenuItem value="asc">Data crescente</MenuItem>
          <MenuItem value="desc">Data decrescente</MenuItem>
        </TextField>
      </Box>
      {draft.period === "custom" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1.5,
            mt: 1.5,
          }}
        >
          <TextField
            label="Agendado de"
            type="date"
            size="small"
            value={draft.dateFrom}
            onChange={(event) => update("dateFrom", event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Agendado até"
            type="date"
            size="small"
            value={draft.dateTo}
            onChange={(event) => update("dateTo", event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
            Inclui os dois dias, no horário de Brasília.
          </Typography>
        </Box>
      )}
      <Autocomplete
        multiple
        disableCloseOnSelect
        size="small"
        options={campaigns}
        value={selectedCampaigns}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionLabel={(option) => option.label}
        onChange={(_, value) =>
          update(
            "customerCampaignIds",
            value.map((item) => item.id),
          )
        }
        renderInput={(params) => <TextField {...params} label="Campanha do cliente" />}
        noOptionsText="Nenhuma campanha disponível"
        sx={{ mt: 1.5 }}
      />
      {commercial && (
        <>
          <Button
            onClick={() => setAdvanced(!advanced)}
            aria-expanded={advanced}
            aria-controls="schedule-advanced-filters"
            sx={{ mt: 1 }}
          >
            Filtros avançados {advanced ? "−" : "+"}
          </Button>
          <Collapse in={advanced} id="schedule-advanced-filters">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
                pt: 1,
              }}
            >
              {Object.entries(commercialOptions).map(([field, config]) => (
                <TextField
                  key={field}
                  select
                  size="small"
                  label={config.label}
                  slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                  value={draft[field as keyof typeof commercialOptions]}
                  onChange={(event) =>
                    update(field as keyof typeof commercialOptions, event.target.value)
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {config.options.map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              ))}
              <Autocomplete
                multiple
                disableCloseOnSelect
                size="small"
                options={[...repurchaseOptions]}
                value={repurchaseOptions.filter(([value]) =>
                  draft.repurchaseStatuses.includes(value),
                )}
                isOptionEqualToValue={(option, value) => option[0] === value[0]}
                getOptionLabel={(option) => option[1]}
                onChange={(_, value) =>
                  update(
                    "repurchaseStatuses",
                    value.map((item) => item[0]),
                  )
                }
                renderInput={(params) => <TextField {...params} label="Situação de recompra" />}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
              Interesse indica intenção de compra; recompra estima o intervalo entre compras. Tempo
              de cadastro é a antiguidade do cliente.
            </Typography>
          </Collapse>
        </>
      )}
    </>
  );
}
