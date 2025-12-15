import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  IconButton,
  CircularProgress,
  Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import ArticleIcon from "@mui/icons-material/Article";
import BadgeIcon from "@mui/icons-material/Badge";
import { WppChatWithDetailsAndMessages, WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { useMemo, useState, useEffect } from "react";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { useTheme } from "@mui/material/styles";
import { useContactsContext } from "@/app/(private)/[instance]/(cruds)/contacts/contacts-context";
import useInternalChatContext from "@/app/(private)/[instance]/internal-context";
import { toast } from "react-toastify";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  contact: WppContact | null;
  chat: WppChatWithDetailsAndMessages | null;
  isLoading: boolean;
}

export default function ContactModal({
  open,
  onClose,
  contact,
  chat,
  isLoading,
}: ContactModalProps) {
  const { startChatByContactId, chats, monitorChats } = useWhatsappContext();
  const { createContact, state: contactsState } = useContactsContext();
  const { users } = useInternalChatContext();
  const theme = useTheme();
  const [isCreating, setIsCreating] = useState(false);

  const normalizedPhone = useMemo(
    () => contact?.phone?.replace(/\D/g, "") || "",
    [contact?.phone]
  );

  const existingContact = useMemo(() => {
    if (!normalizedPhone && contact?.id == null) return null;
    const byId = contact?.id
      ? contactsState.contacts.find((c) => c.id === contact.id)
      : null;
    if (byId) return byId;
    if (!normalizedPhone) return null;
    return contactsState.contacts.find((c) => c.phone?.replace(/\D/g, "") === normalizedPhone) || null;
  }, [contact?.id, normalizedPhone, contactsState.contacts]);

  const effectiveContact = existingContact || contact;
  // Treat ids <= 0 as "no persisted record"
  const hasContactRecord = typeof effectiveContact?.id === "number" && effectiveContact.id > 0;

  const handleStartConversation = async () => {
    if (!hasContactRecord || effectiveContact?.id === undefined || effectiveContact?.id === null) {
      console.warn("[ContactModal] start chat blocked: no contact record", {
        hasContactRecord,
        effectiveContact,
      });
      // Try to create then start if we have name/phone
      if (effectiveContact?.name && (normalizedPhone || effectiveContact.phone)) {
        try {
          console.info("[ContactModal] creating contact before start", {
            name: effectiveContact.name,
            phone: normalizedPhone || effectiveContact.phone,
          });
          const created = await createContact(
            effectiveContact.name,
            normalizedPhone || effectiveContact.phone || "",
          );
          if (created?.id) {
            console.info("[ContactModal] start chat after create (fallback)", created.id);
            const res = await startChatByContactId(created.id);
            console.info("[ContactModal] start chat fallback result", res);
            onClose();
          }
        } catch (err) {
          console.error("Erro ao criar e iniciar conversa:", err);
          toast.error("Não foi possível criar/iniciar a conversa.");
        }
      }
      return;
    }
    try {
      console.info("[ContactModal] start chat (existing)", {
        contactId: effectiveContact.id,
        phone: effectiveContact.phone,
        normalizedPhone,
      });
      const res = await startChatByContactId(effectiveContact.id);
      console.info("[ContactModal] start chat result", res);
      onClose();
    } catch (err) {
      console.error("Erro ao iniciar conversa:", err);
      toast.error("Falha ao iniciar conversa. Veja o console para detalhes.");
    }
  };

  const handleAddAndChat = async () => {
    if (!effectiveContact) return;
    setIsCreating(true);
    const created = await createContact(
      effectiveContact.name,
      normalizedPhone || effectiveContact.phone || "",
    );
    if (created?.id) {
      try {
        console.info("[ContactModal] start chat after create", {
          createdId: created.id,
          createdPhone: created.phone,
          normalizedPhone,
        });
        const res = await startChatByContactId(created.id);
        console.info("[ContactModal] start chat after create result", res);
        onClose();
      } catch (err) {
        console.error("Erro ao iniciar conversa após criar contato:", err);
        toast.error("Contato criado, mas não foi possível iniciar a conversa.");
      }
    } else {
      console.warn("[ContactModal] createContact did not return id", created);
    }
    setIsCreating(false);
  };

  const handleJustAdd = async () => {
    if (!effectiveContact) return;
    setIsCreating(true);
    const created = await createContact(
      effectiveContact.name,
      normalizedPhone || effectiveContact.phone || "",
    );
    if (!created?.id) {
      console.warn("[ContactModal] createContact (just add) returned no id", created);
    }
    setIsCreating(false);
    onClose();
  };

  const companyName = chat?.customer?.FANTASIA || chat?.customer?.RAZAO;
  const avatarUrl = chat?.avatarUrl;
  const activeChat = useMemo(() => {
    if (!effectiveContact) return null;
    const allActiveChats = [...chats, ...monitorChats];
    const idMatch = hasContactRecord
      ? allActiveChats.find((c) => c.contactId === effectiveContact.id)
      : null;
    if (idMatch) return idMatch;
    if (!normalizedPhone) return null;
    return allActiveChats.find(
      (c) => c.contact?.phone && c.contact.phone.replace(/\D/g, "") === normalizedPhone
    );
  }, [effectiveContact, hasContactRecord, normalizedPhone, chats, monitorChats]);

  const phoneToShow = useMemo(() => {
    const digits = normalizedPhone || effectiveContact?.phone?.replace(/\D/g, "") || "";
    if (!digits) return "";
    try {
      return Formatter.phone(digits);
    } catch (err) {
      return digits;
    }
  }, [normalizedPhone, effectiveContact?.phone]);

  const user = users.find((c) => c.CODIGO === activeChat?.userId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="contact-modal-title"
      maxWidth="xs"
      PaperProps={{
        sx: {
          bgcolor: (theme) => theme.palette.background.paper,
          color: (theme) => theme.palette.text.primary,
          borderRadius: 3,
          p: 2,
          textAlign: "center",
        },
      }}
    >
      <DialogTitle
        id="contact-modal-title"
        sx={{
          pt: 1,
          pb: 0.5,
          px: 2,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Typography sx={{ fontWeight: "bold", flexGrow: 1 }}>Detalhes do Contato</Typography>

        <IconButton
          aria-label="fechar"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            ml: 2,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers={false}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 1,
        }}
      >
        {isLoading ? (
          <CircularProgress sx={{ mt: 3, mb: 3 }} />
        ) : contact ? (
          <>
            {avatarUrl ? (
              <Avatar
                src={avatarUrl}
                alt={effectiveContact?.name || ""}
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: (theme) => theme.palette.primary.main,
                  color: (theme) => theme.palette.primary.contrastText,
                  mb: 2,
                }}
                imgProps={{ referrerPolicy: "no-referrer" }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: (theme) => theme.palette.primary.main,
                  color: (theme) => theme.palette.primary.contrastText,
                  mb: 2,
                }}
              >
                {effectiveContact?.name ? effectiveContact.name.charAt(0).toUpperCase() : <PersonIcon />}
              </Avatar>
            )}

            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                mb: 1,
                color: (theme) => theme.palette.text.primary,
              }}
            >
              {effectiveContact?.name}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1,
              }}
            >
              <PhoneIphoneIcon sx={{ mr: 1, color: (theme) => theme.palette.text.secondary }} />
              <Typography variant="body2" sx={{ color: (theme) => theme.palette.text.secondary }}>
                {phoneToShow || "Número indisponível"}
              </Typography>
            </Box>

            {chat?.customer && (
              <Box mt={1} sx={{ color: (theme) => theme.palette.text.secondary }}>
                {companyName && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 1,
                      justifyContent: "center",
                    }}
                  >
                    <BusinessIcon sx={{ mr: 1, color: (theme) => theme.palette.text.secondary }} />
                    <Typography variant="body2">{companyName}</Typography>
                  </Box>
                )}
                {chat.customer.CPF_CNPJ && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 1,
                      justifyContent: "center",
                    }}
                  >
                    <BadgeIcon sx={{ mr: 1, color: (theme) => theme.palette.text.secondary }} />
                    <Typography variant="body2">{chat.customer.CPF_CNPJ}</Typography>
                  </Box>
                )}
                {chat.customer.COD_ERP && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 1,
                      justifyContent: "center",
                    }}
                  >
                    <ArticleIcon sx={{ mr: 1, color: (theme) => theme.palette.text.secondary }} />
                    <Typography variant="body2">Cód. ERP: {chat.customer.COD_ERP}</Typography>
                  </Box>
                )}
              </Box>
            )}
          </>
        ) : (
          <Typography
            sx={{
              textAlign: "center",
              mt: 2,
              color: (theme) => theme.palette.text.secondary,
            }}
          >
            Contato não encontrado.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          flexDirection: "column",
          gap: 1,
          px: 2,
          pb: 2,
        }}
      >
        {activeChat ? (
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.action.hover,
              width: "100%",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: "medium",
                color: (theme) => theme.palette.text.secondary,
              }}
            >
              Em atendimento com:{" "}
              <strong style={{ color: theme.palette.text.primary }}>
                {user?.NOME || "Outro Operador"}
              </strong>
            </Typography>
          </Box>
        ) : hasContactRecord ? (
          <Button
            onClick={handleStartConversation}
            variant="contained"
            startIcon={<WhatsAppIcon />}
            sx={{
              textTransform: "none",
              width: "100%",
              fontWeight: "bold",
              borderRadius: 2,
            }}
            disabled={isLoading || !effectiveContact}
          >
            Iniciar Conversa
          </Button>
        ) : (
          <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
            <Button
              onClick={handleJustAdd}
              variant="outlined"
              sx={{
                textTransform: "none",
                flexGrow: 1,
                borderRadius: 2,
              }}
              disabled={isCreating}
            >
              Adicionar
            </Button>
            <Button
              onClick={handleAddAndChat}
              variant="contained"
              startIcon={
                isCreating ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon />
              }
              sx={{
                textTransform: "none",
                flexGrow: 1,
                fontWeight: "bold",
                borderRadius: 2,
              }}
              disabled={isCreating}
            >
              Conversar
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
