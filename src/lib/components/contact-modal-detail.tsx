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
  const { createContact } = useContactsContext();
  const { users } = useInternalChatContext();
  const theme = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [shouldStartChat, setShouldStartChat] = useState(false);

  useEffect(() => {
    if (shouldStartChat) {
      setShouldStartChat(false);
      onClose();
    }
  }, [shouldStartChat, startChatByContactId, onClose, contact?.phone]);

  const handleStartConversation = () => {
    if (!contact || !contact.id) return;
    startChatByContactId(contact.id);
    onClose();
  };

  const handleAddAndChat = async () => {
    if (!contact) return;
    setIsCreating(true);
    setShouldStartChat(true);
    await createContact(contact.name, contact.phone);
    setIsCreating(false);
  };

  const handleJustAdd = async () => {
    if (!contact) return;
    setIsCreating(true);
    await createContact(contact.name, contact.phone);
    setIsCreating(false);
    onClose();
  };

  const companyName = chat?.customer?.FANTASIA || chat?.customer?.RAZAO;
  const avatarUrl = chat?.avatarUrl;
  const activeChat = useMemo(() => {
    if (!contact || !contact.id) return null;
    const allActiveChats = [...chats, ...monitorChats];
    return allActiveChats.find((c) => c.contactId === contact.id);
  }, [contact, chats, monitorChats]);

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
                alt={contact.name || ""}
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
                {contact.name ? contact.name.charAt(0).toUpperCase() : <PersonIcon />}
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
              {contact.name}
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
                {contact.phone ? Formatter.phone(contact.phone) : "Número indisponível"}
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
        ) : contact?.id ? (
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
            disabled={isLoading || !contact}
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
