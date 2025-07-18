import { useState, useContext } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  Typography,
  Divider,
  Box,
  Button,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { useTheme } from "@mui/material/styles";

export default function NotificationsDropdown() {
  const theme = useTheme();
  const { notifications, getNotifications, markAllAsReadNotification } = useContext(WhatsappContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    getNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClear = async () => {
    await markAllAsReadNotification();
    handleClose();
  };

  // Filtrar só as não lidas
  const unreadNotifications = notifications.filter((notif) => !notif.read);

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} aria-label="notificações">
        <Badge badgeContent={unreadNotifications.length} color="error" max={99}>
          <NotificationsIcon sx={{ color: theme.palette.text.primary }} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: { maxHeight: 400, width: 360, padding: 0 },
          elevation: 4,
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box
          px={2}
          py={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          bgcolor="background.paper"
          borderBottom={1}
          borderColor="divider"
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            Notificações
          </Typography>
          <Button
            size="small"
            onClick={handleClear}
            disabled={!unreadNotifications.length}
            sx={{ textTransform: "none" }}
          >
            Limpar
          </Button>
        </Box>

        {unreadNotifications.length === 0 ? (
          <MenuItem disabled sx={{ justifyContent: "center", fontStyle: "italic" }}>
            Sem notificações
          </MenuItem>
        ) : (
          unreadNotifications.map((notif) => (
            <MenuItem key={notif.id || notif.title} onClick={handleClose} divider>
              <ListItemText
                primary={
                  <Typography sx={{ fontWeight: "medium", fontSize: "1rem" }}>
                    {notif.title}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="body2"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "normal",
                    }}
                  >
                    {notif.description}
                  </Typography>
                }
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
