import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { useWhatsappContext, WppClient } from "../../whatsapp-context";

// Example channel data
type ChannelType = "WWEBJS" | "WABA" | "GUPSHUP" | "REMOTE";

const whatsappIcon = <WhatsAppIcon sx={{ fontSize: 20 }} />;

const channelTypeColors: Record<ChannelType, string[]> = {
  WWEBJS: [
    "#19d380", // green
    "#f44336", // red
    "#ffeb3b", // yellow
  ],
  WABA: [
    "#197bf4", // blue
    "#9c27b0", // purple
    "#00bcd4", // cyan
  ],
  GUPSHUP: [
    "#ff9f1c", // orange
    "#4caf50", // green
    "#e91e63", // pink
  ],
  REMOTE: [
    "#607d8b", // blue grey
    "#795548", // brown
    "#3f51b5", // indigo
  ],
};

interface ChannelSelectOptions {
  channels: WppClient[];
  selectedChannel: WppClient | null;
  onChange?: (value: WppClient) => void;
}

// Função para cor de fundo (pode ser fixa ou baseada em tipo)

// Cores predefinidas para os 3 primeiros canais
const predefinedColors = [
  "#19d380", // verde - primeiro canal
  "#197bf4", // azul - segundo canal
  "#ff9f1c", // laranja - terceiro canal
];

export function getChannelColor(channel: WppClient, channels: WppClient[]) {
  // Encontrar o índice do canal na lista geral
  const globalIndex = channels.findIndex((c) => c.id === channel.id);

  // Se for um dos 3 primeiros canais, usar cor predefinida
  if (globalIndex >= 0 && globalIndex < 3) {
    return predefinedColors[globalIndex];
  }

  // Para canais além dos 3 primeiros, usar cores baseadas no tipo
  const type = channel.type as ChannelType;
  const sameTypeChannels = channels.filter((c) => c.type === channel.type);
  const index = sameTypeChannels.findIndex((c) => c.id === channel.id);
  const colors = channelTypeColors[type] || ["#ececec"];
  return colors[index % colors.length];
}

function getChannelVisual(channel: WppClient | null, channels: WppClient[]) {
  const color = channel ? getChannelColor(channel, channels) : "#ececec";
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: "0.5rem",
        background: color,
        color: "#fff",
      }}
    >
      {whatsappIcon}
    </Box>
  );
}

export default function ChannelSelect({
  channels,
  selectedChannel,
  onChange,
}: ChannelSelectOptions) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { parameters } = useWhatsappContext();
  const isDisabled = parameters["disable_channel_switch"] === "true";

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (isDisabled) {
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (channel: WppClient) => {
    onChange?.(channel);
    handleClose();
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          borderRadius: 2,
          transition: "background 0.2s, opacity 0.2s",
          cursor: isDisabled ? "not-allowed" : "pointer",
          px: 0.5,
          py: 0.25,
          opacity: isDisabled ? 0.5 : 1,
          "&:hover": {
            background: isDisabled ? "transparent" : "rgba(99,102,241,0.08)", // subtle indigo hover
          },
        }}
        onClick={isDisabled ? undefined : handleOpen}
        title={
          isDisabled ? "Troca de canal desabilitada" : selectedChannel?.name || "Selecione um canal"
        }
      >
        {getChannelVisual(selectedChannel, channels)}
        <ExpandMoreIcon sx={{ fontSize: 18, ml: 0.5, color: "text.secondary" }} />
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {channels.map((channel) => (
          <MenuItem key={channel.id} onClick={() => handleSelect(channel)}>
            <ListItemIcon>{getChannelVisual(channel, channels)}</ListItemIcon>
            <ListItemText>{channel.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
