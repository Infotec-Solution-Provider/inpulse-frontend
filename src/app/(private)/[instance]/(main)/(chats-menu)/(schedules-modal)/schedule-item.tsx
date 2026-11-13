import { Box, Chip, Typography } from "@mui/material";
import type { UnifiedSchedule } from "@/lib/sdk-local";
import { formatScheduleDate, scheduleTimeLabel } from "./schedule-query";

export function ScheduleItem({
  schedule: s,
  referenceAt,
}: {
  schedule: UnifiedSchedule;
  referenceAt?: string;
}) {
  const timeLabel = scheduleTimeLabel(s, referenceAt);
  const name = s.customerName || s.customerFantasyName || s.contactName || "Cliente não vinculado";
  const details = [
    ["Contato", s.contactName],
    ["Telefone", s.contactPhone],
    ["Origem", s.customerOriginDescription],
    ["Campanha do cliente", s.customerCampaignName],
    ...(s.telephonyCampaignName ? [["Campanha operacional", s.telephonyCampaignName]] : []),
  ];
  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 0.75 }}>
        <Typography variant="subtitle2">{formatScheduleDate(s.scheduleAt)}</Typography>
        <Chip
          size="small"
          label={timeLabel}
          color={timeLabel === "Atrasado" ? "warning" : "default"}
          variant="outlined"
        />
        <Chip
          size="small"
          label={s.channel === "WHATSAPP" ? "WhatsApp" : "Telefonia"}
          variant="outlined"
        />
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
        {name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
        {[s.contactName, s.contactPhone].filter(Boolean).join(" · ") || "Contato indisponível"}
      </Typography>
      {s.customerCampaignName && (
        <Typography variant="caption" color="text.secondary">
          {s.customerCampaignName}
        </Typography>
      )}
      <Box
        component="details"
        sx={{
          mt: 1,
          "& summary": { cursor: "pointer", fontSize: 13, py: 0.5 },
          "& summary:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
        }}
      >
        <summary aria-label={`Detalhes do agendamento ${s.scheduleId}`}>
          Detalhes · #{s.scheduleId}
        </summary>
        <Box
          component="dl"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            gap: 1,
            m: 0,
            mt: 1,
          }}
        >
          {details.map(([label, value]) => (
            <Box key={label} sx={{ minWidth: 0 }}>
              <Typography component="dt" variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: "anywhere" }}>
                {value || "—"}
              </Typography>
            </Box>
          ))}
        </Box>
        {s.description && (
          <Typography
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", mt: 1 }}
          >
            {s.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
