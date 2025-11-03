import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { WppClient } from "../../whatsapp-context";

// Example channel data
type ChannelType = "WWEBJS" | "WABA" | "GUPSHUP";

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
};

interface ChannelSelectOptions {
  channels: WppClient[];
  selectedChannel: WppClient;
  onChange?: (value: WppClient) => void;
}

// Função para cor de fundo (pode ser fixa ou baseada em tipo)

function getChannelColor(channel: WppClient, channels: WppClient[]) {
  const type = channel.type as ChannelType;
  const sameTypeChannels = channels.filter((c) => c.type === channel.type);
  const index = sameTypeChannels.findIndex((c) => c.id === channel.id);
  const colors = channelTypeColors[type] || ["#ececec"];
  return colors[index % colors.length];
}

function getChannelVisual(channel: WppClient, channels: WppClient[]) {
  const color = getChannelColor(channel, channels);
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

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
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
          transition: "background 0.2s",
          cursor: "pointer",
          px: 0.5,
          py: 0.25,
          "&:hover": {
            background: "rgba(99,102,241,0.08)", // subtle indigo hover
          },
        }}
        onClick={handleOpen}
        title={selectedChannel.name}
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
