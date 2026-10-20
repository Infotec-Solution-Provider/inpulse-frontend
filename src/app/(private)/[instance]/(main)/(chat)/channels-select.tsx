import { Button, ListItemText, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { UiIcon } from "@/lib/ui-system/icons";
import { useWhatsappContext, WppClient } from "../../whatsapp-context";

// Example channel data
type ChannelType = "WWEBJS" | "WABA" | "GUPSHUP" | "REMOTE";

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
  disabled?: boolean;
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

export default function ChannelSelect({
  channels,
  selectedChannel,
  onChange,
  disabled = false,
}: ChannelSelectOptions) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { parameters } = useWhatsappContext();
  const isDisabled = disabled || parameters["disable_channel_switch"] === "true";

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
      <Button
        className="ip-composer-channel"
        onClick={handleOpen}
        disabled={isDisabled}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        aria-label={`Canal de envio: ${selectedChannel?.name || "selecione um canal"}${isDisabled ? ". Troca de canal desabilitada" : ""}`}
        title={selectedChannel?.name || "Selecione um canal"}
        startIcon={<UiIcon name="conversations" scale="metadata" />}
        endIcon={<UiIcon name="chevronDown" scale="metadata" />}
      >
        <span>{selectedChannel?.name || "Selecionar canal"}</span>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ list: { "aria-label": "Canal de envio" } }}
      >
        {channels.map((channel) => (
          <MenuItem
            key={channel.id}
            className="ip-attendance-menu-item"
            selected={selectedChannel?.id === channel.id}
            onClick={() => handleSelect(channel)}
          >
            <UiIcon name="conversations" scale="row" />
            <ListItemText>{channel.name}</ListItemText>
            {selectedChannel?.id === channel.id && <UiIcon name="finish" scale="row" />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
