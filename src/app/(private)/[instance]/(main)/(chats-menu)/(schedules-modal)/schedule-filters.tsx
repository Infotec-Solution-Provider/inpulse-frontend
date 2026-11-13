import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Collapse,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import CustomerBusinessFiltersPanel from "@/lib/components/customer-business-filters";
import CustomerBasicFilters from "@/lib/components/customer-basic-filters";
import useCustomerBusinessFilterOptions from "@/lib/hooks/use-customer-business-filter-options";
import {
  customerBasicFields,
  periodOptions,
  type ScheduleCustomerFilters,
  type ScheduleFilters,
} from "./schedule-query";

export type CampaignOption = { id: string; label: string };
function ScheduleCustomerFilterFields({
  draft,
  setDraft,
  commercial,
}: {
  draft: ScheduleFilters;
  setDraft: (next: ScheduleFilters) => void;
  commercial: boolean;
}) {
  const { options, loading, error, refetch } = useCustomerBusinessFilterOptions({
    includeCampaigns: false,
  });
  return (
    <>
      <Typography component="h3" variant="subtitle2" sx={{ mt: 1.5, mb: 1 }}>
        Dados do cliente
      </Typography>
      <Box
        sx={{
          "& > .ip-crud-grid": {
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          },
        }}
      >
        <CustomerBasicFilters
          showName={false}
          filters={draft.customer}
          onChange={(next) =>
            setDraft({
              ...draft,
              customer: Object.fromEntries(
                customerBasicFields.map((key) => [key, next[key] ?? ""]),
              ) as ScheduleCustomerFilters,
            })
          }
        />
      </Box>
      <Typography component="h3" variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Relacionamento e compras
      </Typography>
      {loading && (
        <Typography role="status" variant="caption" color="text.secondary">
          Carregando opções do CRM…
        </Typography>
      )}
      {error && (
        <Alert
          severity="warning"
          action={
            <Button onClick={refetch} color="inherit" size="small">
              Recarregar opções
            </Button>
          }
        >
          Não foi possível carregar segmentos e usuários fidelizados.
        </Alert>
      )}
      <Box
        sx={{
          "& > .grid": {
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          },
          "& > .grid > .grid": {
            display: "grid",
            gap: 1,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          },
          '& > .grid > [class~="sm:col-span-2"]': { gridColumn: "1 / -1" },
        }}
      >
        <CustomerBusinessFiltersPanel
          filters={draft.business}
          options={options}
          hiddenFields={["campaignIds"]}
          financialAllowed={commercial}
          lazyLookups
          phoneLabel="Telefone do cliente"
          onChange={(business) =>
            setDraft({ ...draft, business: { ...business, campaignIds: [] } })
          }
        />
      </Box>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
        Cadastro e compras usam as datas do CRM. O período do agendamento continua no filtro
        principal.
      </Typography>
    </>
  );
}

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
    (id) => campaigns.find((option) => option.id === id) ?? { id, label: `Campanha #${id}` },
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
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
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
          <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1/-1" }}>
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
        onChange={(_, selected) =>
          update(
            "customerCampaignIds",
            selected.map((option) => option.id),
          )
        }
        renderInput={(params) => <TextField {...params} label="Campanha do cliente" />}
        noOptionsText="Nenhuma campanha disponível"
        sx={{ mt: 1.5 }}
      />
      <Button
        onClick={() => setAdvanced(!advanced)}
        aria-expanded={advanced}
        aria-controls="schedule-advanced-filters"
        sx={{ mt: 1 }}
      >
        Filtros avançados {advanced ? "−" : "+"}
      </Button>
      <Collapse in={advanced} id="schedule-advanced-filters" unmountOnExit>
        <ScheduleCustomerFilterFields draft={draft} setDraft={setDraft} commercial={commercial} />
      </Collapse>
    </>
  );
}
