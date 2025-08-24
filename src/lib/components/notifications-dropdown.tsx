"use client";

import { useState, useContext, useEffect, useMemo, useCallback } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  Typography,
  Box,
  Button,
  CircularProgress,
  Avatar,
  ListItemAvatar,
  ButtonGroup,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ChatIcon from "@mui/icons-material/Chat";
import { useTheme } from "@mui/material/styles";
import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { AppNotification, WppChatWithDetailsAndMessages, WppContact } from "@in.pulse-crm/sdk";
import ContactModal from "./contact-modal-detail";

const NOTIFICATIONS_PER_PAGE = 15;

const formatTimeAgo = (dateInput: string | Date): string => {
  const now = new Date();
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diffInSeconds < 60) return "agora mesmo";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours} h`;
  return `${days} d`;
};

type GetNotificationsResult = {
  totalCount: number;
  notifications: AppNotification[];
};

const useNotificationHandler = () => {
  const {
    notifications: contextNotifications = [],
    getNotifications,
    markAllAsReadNotification,
    markAsReadNotificationById,
  } = useContext(WhatsappContext);

  const [localNotifications, setLocalNotifications] = useState<AppNotification[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (pageToFetch: number, append: boolean = false) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);
      try {
        const { totalCount, notifications: newNotifications } =
          (await getNotifications({
            page: pageToFetch,
            pageSize: NOTIFICATIONS_PER_PAGE,
          })) as GetNotificationsResult;

        if (append) {
          setLocalNotifications((prev) => {
            const map = new Map<number, AppNotification>();
            prev.forEach((p) => map.set(p.id as number, p));
            newNotifications.forEach((n) => map.set(n.id as number, n));
            const combined = Array.from(map.values());
            setHasMore(combined.length < totalCount);
            return combined;
          });
        } else {
          setLocalNotifications(newNotifications);
          setHasMore(newNotifications.length < totalCount);
        }

        setCurrentPage(pageToFetch);
      } catch (err) {
        console.error("Erro ao buscar notificações:", err);
        setError("Não foi possível carregar as notificações.");
      } finally {
        setIsLoading(false);
      }
    },
    [getNotifications, isLoading]
  );

  const markSingleAsReadNotification = useCallback(
    async (notificationId: number) => {
      setLocalNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
      );
      try {
        await markAsReadNotificationById(notificationId);
      } catch (err) {
        console.error("Falha ao marcar notificação como lida:", err);
      }
    },
    [markAsReadNotificationById]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchNotifications(currentPage + 1, true);
    }
  }, [fetchNotifications, currentPage, isLoading, hasMore]);

  const handleClear = useCallback(async () => {
    setLocalNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    try {
      await markAllAsReadNotification();
    } catch (err) {
      console.error("Falha ao marcar todas como lidas:", err);
    }
  }, [markAllAsReadNotification]);

  const unreadCount = useMemo(
    () => localNotifications.filter((notif) => !notif.read).length,
    [localNotifications]
  );

  const sortedNotifications = useMemo(() => {
    return [...localNotifications].sort((a, b) => {
      if (a.read === b.read) {
        return new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime();
      }
      return a.read ? 1 : -1;
    });
  }, [localNotifications]);

  useEffect(() => {
    if (contextNotifications.length > 0 && localNotifications.length === 0) {
      setLocalNotifications(contextNotifications);
    }
  }, []);

  return {
    isLoading,
    hasMore,
    unreadCount,
    sortedNotifications,
    error,
    fetchNotifications,
    handleLoadMore,
    handleClear,
    markSingleAsReadNotification,
  };
};

export default function NotificationsDropdown() {
  const theme = useTheme();
  const {
    isLoading,
    hasMore,
    unreadCount,
    sortedNotifications,
    error,
    fetchNotifications,
    handleLoadMore,
    handleClear,
    markSingleAsReadNotification,
  } = useNotificationHandler();

  const { getChatById, chat } = useContext(WhatsappContext);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<WppContact | null>(null);
  const [selectedChat, setSelectedChat] = useState<WppChatWithDetailsAndMessages | null>(null);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all'); // NOVO: Estado para o filtro

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
      fetchNotifications(1, false);
    },
    [fetchNotifications]
  );

  const handleClose = useCallback(() => setAnchorEl(null), []);
  const handleModalClose = useCallback(() => setIsModalOpen(false), []);

  const handleNotificationClick = useCallback(
    async (notif: AppNotification) => {
      handleClose();
      setIsModalOpen(true);
      setIsContactLoading(true);
      setSelectedContact(null);

      if (!notif.read) {
        markSingleAsReadNotification(notif.id as number);
      }

      try {
        if (notif.chatId == null) {
          throw new Error("Notificação sem ID de chat.");
        }

      const chatResult = (await getChatById(notif.chatId as any)) as WppChatWithDetailsAndMessages | null | undefined;

      const contactData = chatResult?.contact ?? chat?.contact ?? null;

      setSelectedContact(contactData);
      setSelectedChat(chatResult ?? null);
      } catch (err) {
        console.error("Erro ao buscar contato:", err);
        setSelectedContact(null);
      } finally {
        setIsContactLoading(false);
      }
    },
    [chat?.contact, getChatById, handleClose, markSingleAsReadNotification]
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return sortedNotifications.filter(n => !n.read);
    }
    return sortedNotifications;
  }, [sortedNotifications, filter]);


  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} aria-label="notificações">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon sx={{ color: theme.palette.text.primary }} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ style: { maxHeight: 500, width: 380, padding: 0, borderRadius: '8px' } }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box
          px={2}
          py={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          borderBottom={1}
          borderColor="divider"
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            Notificações
          </Typography>
          <Button
            size="small"
            onClick={handleClear}
            disabled={unreadCount === 0 || isLoading}
            sx={{ textTransform: "none", fontSize: '0.8rem' }}
          >
            Marcar todas como lidas
          </Button>
        </Box>

        <Box px={2} py={1} borderBottom={1} borderColor="divider">
          <ButtonGroup size="small" fullWidth>
            <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => setFilter('all')}>Tudo</Button>
            <Button variant={filter === 'unread' ? 'contained' : 'outlined'} onClick={() => setFilter('unread')}>Não lidas</Button>
          </ButtonGroup>
        </Box>

        {isLoading && filteredNotifications.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <MenuItem disabled sx={{ justifyContent: "center", color: "error.main", p: 2 }}>
            {error}
          </MenuItem>
        ) : filteredNotifications.length === 0 ? (
          <MenuItem disabled sx={{ justifyContent: "center", fontStyle: "italic", p: 4 }}>
            {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Sem notificações'}
          </MenuItem>
        ) : (
          <Box>
            {filteredNotifications.map((notif) => (
              <MenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                sx={{
                  py: 1.5,
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  backgroundColor: !notif.read ? theme.palette.action.hover : "transparent",
                  '&:hover': {
                    backgroundColor: theme.palette.action.selected,
                  }
                }}
              >
                <ListItemAvatar sx={{ minWidth: 'auto' }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <ChatIcon sx={{
                        fontSize: 18,
                        p: '2px',
                        color: 'white',
                        backgroundColor: 'primary.main',
                        borderRadius: '50%',
                        border: `2px solid ${theme.palette.background.paper}`
                      }} />
                    }
                  >

                    <Avatar alt={notif.title} sx={{ width: 56, height: 56 }} />
                  </Badge>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: '500', color: 'text.primary' }}>
                      {notif.title}
                    </Typography>
                  }
secondary={
    <>
      <Typography
        component="span"
        variant="body2"
        sx={{ whiteSpace: "normal", wordBreak: "break-word", display: "block" }}
      >
        {notif.description}
      </Typography>
      <Typography
        component="span"
        variant="caption"
        sx={{
          fontWeight: !notif.read ? "bold" : "normal",
          color: !notif.read ? "primary.main" : "text.secondary",
        }}
      >
        {formatTimeAgo(notif.createdAt as any)}
      </Typography>
                  </>
              }
                  sx={{ my: 0 }}
                />

                {!notif.read && (
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, ml: 1 }} />
                )}
              </MenuItem>
            ))}

            {hasMore && (
              <Box px={2} py={1} sx={{ textAlign: "center" }}>
                <Button
                  fullWidth
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
                >
                  {isLoading ? "Carregando..." : "Ver notificações anteriores"}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Menu>

      <ContactModal
        open={isModalOpen}
        onClose={handleModalClose}
        contact={selectedContact}
        chat={selectedChat}
        isLoading={isContactLoading}
      />
    </>
  );
}
