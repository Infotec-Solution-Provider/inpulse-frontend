"use client";

import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import ContactsProvider from "@/app/(private)/[instance]/(cruds)/contacts/contacts-context";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Badge, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dynamic from "next/dynamic";
import { useContext, useMemo, useState } from "react";

const NotificationsDropdown = dynamic(() => import("./notifications-dropdown"), {
  ssr: false,
});

export default function LazyNotificationsDropdown() {
  const theme = useTheme();
  const { notifications = [] } = useContext(WhatsappContext);
  const [activated, setActivated] = useState(false);
  const [openOnMount, setOpenOnMount] = useState(false);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );
  const preload = () => void import("./notifications-dropdown");

  if (activated) {
    return (
      <ContactsProvider>
        <NotificationsDropdown openOnMount={openOnMount} />
      </ContactsProvider>
    );
  }

  return (
    <IconButton
      color="inherit"
      aria-label="notificações"
      onMouseEnter={preload}
      onFocus={preload}
      onClick={() => {
        setOpenOnMount(true);
        setActivated(true);
      }}
    >
      <Badge badgeContent={unreadCount} color="error" max={99}>
        <NotificationsIcon sx={{ color: theme.palette.text.primary }} />
      </Badge>
    </IconButton>
  );
}
