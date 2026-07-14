"use client";

import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import {
  NotificationEventKey,
  NotificationEventPreferences,
  UserNotificationPreferences,
} from "@/lib/sdk-local";
import { dispatchConfiguredNotification } from "@/lib/utils/notification-dispatch";
import {
  notificationEvents,
  NOTIFICATION_SOUND_OPTIONS,
} from "@/lib/utils/notification-preferences";
import SaveIcon from "@mui/icons-material/Save";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Slider,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

interface NotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsSection = "notifications";

type NotificationChannelsPatch = Partial<
  Omit<NotificationEventPreferences["channels"], "sound">
> & {
  sound?: Partial<NotificationEventPreferences["channels"]["sound"]>;
};

type NotificationEventPatch = Partial<Omit<NotificationEventPreferences, "channels">> & {
  channels?: NotificationChannelsPatch;
};

function updateEventConfig(
  state: UserNotificationPreferences,
  event: NotificationEventKey,
  patch: NotificationEventPatch,
): UserNotificationPreferences {
  return {
    ...state,
    events: {
      ...state.events,
      [event]: {
        ...state.events[event],
        ...patch,
        channels: {
          ...state.events[event].channels,
          ...(patch.channels ?? {}),
          sound: {
            ...state.events[event].channels.sound,
            ...(patch.channels?.sound ?? {}),
          },
        },
      },
    },
  };
}

export default function NotificationPreferencesModal({
  open,
  onClose,
}: NotificationPreferencesModalProps) {
  const theme = useTheme();
  const { notificationPreferences, updateNotificationPreferences } = useWhatsappContext();
  const [activeSection, setActiveSection] = useState<SettingsSection>("notifications");
  const [draft, setDraft] = useState<UserNotificationPreferences>(notificationPreferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(notificationPreferences);
      setActiveSection("notifications");
    }
  }, [notificationPreferences, open]);

  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(notificationPreferences),
    [draft, notificationPreferences],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNotificationPreferences(draft);
      toast.success("Preferências de notificação atualizadas com sucesso.");
      onClose();
    } catch {
      toast.error("Falha ao salvar preferências de notificação.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async (event: NotificationEventKey, label: string) => {
    const eventConfig = draft.events[event];
    const hasAnyEnabledChannel =
      eventConfig.channels.toast ||
      eventConfig.channels.browser ||
      eventConfig.channels.sound.enabled;

    if (!hasAnyEnabledChannel) {
      toast.info("Ative pelo menos um canal para testar a notificação.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      eventConfig.channels.browser &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore permission prompt failures and proceed with available channels.
      }
    }

    dispatchConfiguredNotification(draft, event, {
      title: `Teste: ${label}`,
      body: "Esta é uma notificação de teste com a sua configuração atual.",
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          backgroundColor: "background.paper",
          color: "text.primary",
        },
      }}
    >
      <DialogTitle>Configurações</DialogTitle>
      <DialogContent dividers>
        <Box className="grid gap-4 md:grid-cols-[220px_1fr]" sx={{ color: "text.primary" }}>
          <Box>
            <List
              disablePadding
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                backgroundColor: "background.default",
              }}
            >
              <ListItemButton
                selected={activeSection === "notifications"}
                onClick={() => setActiveSection("notifications")}
              >
                <ListItemText
                  primary="Notificações"
                  secondary="Canais e comportamento por evento"
                />
              </ListItemButton>
            </List>
          </Box>

          <Box>
            {activeSection === "notifications" && (
              <Box className="flex flex-col gap-4">
                {notificationEvents.map((eventItem) => {
                  const eventConfig = draft.events[eventItem.key];
                  return (
                    <Box
                      key={eventItem.key}
                      className="rounded p-4"
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: "background.default",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Typography variant="h6">{eventItem.label}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleTestNotification(eventItem.key, eventItem.label)}
                          >
                            Testar
                          </Button>
                          <Switch
                            checked={eventConfig.enabled}
                            onChange={(e) => {
                              setDraft((prev) =>
                                updateEventConfig(prev, eventItem.key, { enabled: e.target.checked }),
                              );
                            }}
                          />
                        </Stack>
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      <Box className="grid gap-3 md:grid-cols-2">
                        <Box
                          className="flex items-center justify-between rounded px-3 py-2"
                          sx={{
                            backgroundColor: "action.hover",
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography variant="body2">Toast flutuante</Typography>
                          <Switch
                            checked={eventConfig.channels.toast}
                            onChange={(e) => {
                              setDraft((prev) =>
                                updateEventConfig(prev, eventItem.key, {
                                  channels: { toast: e.target.checked },
                                }),
                              );
                            }}
                          />
                        </Box>

                        <Box
                          className="flex items-center justify-between rounded px-3 py-2"
                          sx={{
                            backgroundColor: "action.hover",
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography variant="body2">Notificação nativa do navegador</Typography>
                          <Switch
                            checked={eventConfig.channels.browser}
                            onChange={(e) => {
                              setDraft((prev) =>
                                updateEventConfig(prev, eventItem.key, {
                                  channels: { browser: e.target.checked },
                                }),
                              );
                            }}
                          />
                        </Box>

                        <Box
                          className="flex items-center justify-between rounded px-3 py-2"
                          sx={{
                            backgroundColor: "action.hover",
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography variant="body2">Som</Typography>
                          <Switch
                            checked={eventConfig.channels.sound.enabled}
                            onChange={(e) => {
                              setDraft((prev) =>
                                updateEventConfig(prev, eventItem.key, {
                                  channels: { sound: { enabled: e.target.checked } },
                                }),
                              );
                            }}
                          />
                        </Box>

                        <Box
                          className="flex items-center justify-between rounded px-3 py-2"
                          sx={{
                            backgroundColor: "action.hover",
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography variant="body2">Ignorar com chat em foco</Typography>
                          <Switch
                            checked={eventConfig.suppressWhenChatFocused}
                            onChange={(e) => {
                              setDraft((prev) =>
                                updateEventConfig(prev, eventItem.key, {
                                  suppressWhenChatFocused: e.target.checked,
                                }),
                              );
                            }}
                          />
                        </Box>
                      </Box>

                      <Box className="mt-3 grid gap-3 md:grid-cols-2">
                        <TextField
                          select
                          size="small"
                          label="Som"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              backgroundColor: "background.paper",
                            },
                          }}
                          value={eventConfig.channels.sound.file}
                          onChange={(e) => {
                            setDraft((prev) =>
                              updateEventConfig(prev, eventItem.key, {
                                channels: {
                                  sound: { file: e.target.value },
                                },
                              }),
                            );
                          }}
                        >
                          {NOTIFICATION_SOUND_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>

                      <Box className="mt-4 px-2">
                        <Typography variant="caption" display="block" gutterBottom color="text.secondary">
                          Volume do som
                        </Typography>
                        <Slider
                          min={0}
                          max={1}
                          step={0.05}
                          value={eventConfig.channels.sound.volume}
                          onChange={(_, value) => {
                            const safeValue = typeof value === "number" ? value : value[0] || 0.5;
                            setDraft((prev) =>
                              updateEventConfig(prev, eventItem.key, {
                                channels: {
                                  sound: { volume: safeValue },
                                },
                              }),
                            );
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined" disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!hasChanges || isSaving}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
