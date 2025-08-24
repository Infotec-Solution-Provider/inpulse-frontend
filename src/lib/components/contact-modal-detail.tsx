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
  const { createContact, contact: newCreatedContact } = useContactsContext();
  const {users} = useInternalChatContext()
  const theme = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [shouldStartChat, setShouldStartChat] = useState(false);

  useEffect(() => {
    if (shouldStartChat && newCreatedContact && newCreatedContact.id && newCreatedContact.phone === contact?.phone) {
      startChatByContactId(newCreatedContact.id);
      setShouldStartChat(false);
      onClose();
    }
  }, [newCreatedContact, shouldStartChat, startChatByContactId, onClose, contact?.phone]);


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
  }

  const companyName = chat?.customer?.FANTASIA || chat?.customer?.RAZAO;
  const avatarUrl = chat?.avatarUrl;
  const activeChat = useMemo(() => {
    if (!contact || !contact.id) return null;
    const allActiveChats = [...chats, ...monitorChats];
    return allActiveChats.find(
      (c) => c.contactId === contact.id
    );
  }, [contact, chats, monitorChats]);

  const user = users.find(c=>c.CODIGO === activeChat?.userId)
  const avatarStyles = {
    width: 64,
    height: 64,
    ml: 2,
    bgcolor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="contact-modal-title"
      maxWidth="xs"
    >
      <DialogTitle
        id="contact-modal-title"
        sx={{
          m: 0,
          p: 2,
          pb: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        variant="h6"
      >
        Detalhes do Contato
        <IconButton
          aria-label="fechar"
          onClick={onClose}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
            <CircularProgress />
          </Box>
        ) : contact ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: "bold", flexGrow: 1 }}>
                {contact.name}
              </Typography>
              {avatarUrl ? (
                <Avatar src={avatarUrl} alt={contact.name || ""} sx={avatarStyles} imgProps={{ referrerPolicy: "no-referrer" }} />
              ) : (
                <Avatar sx={avatarStyles}>
                  {contact.name ? contact.name.charAt(0).toUpperCase() : <PersonIcon />}
                </Avatar>
              )}
            </Box>

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <PhoneIphoneIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  {contact.phone ? Formatter.phone(contact.phone) : "Número indisponível"}
                </Typography>
              </Box>

              {chat?.customer && (
                <Box mt={1}>
                  {companyName && (<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}> <BusinessIcon color="action" sx={{ mr: 1 }} /> <Typography variant="body2">{companyName}</Typography> </Box>)}
                  {chat.customer.CPF_CNPJ && (<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}> <BadgeIcon color="action" sx={{ mr: 1 }} /> <Typography variant="body2">{chat.customer.CPF_CNPJ}</Typography> </Box>)}
                  {chat.customer.COD_ERP && (<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}> <ArticleIcon color="action" sx={{ mr: 1 }} /> <Typography variant="body2">Cód. ERP: {chat.customer.COD_ERP}</Typography> </Box>)}
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Typography sx={{ textAlign: "center", mt: 2 }}>
            Contato não encontrado.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: "8px 16px" }}>
        {activeChat ? (
          <Box sx={{ p: 1, textAlign: 'center', borderRadius: 1, bgcolor: 'action.hover', width: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              Em atendimento com: <strong>{user?.NOME || "Outro Operador"}</strong>
            </Typography>
          </Box>
        ) : contact?.id ? (
          <Button
            onClick={handleStartConversation}
            variant="contained"
            startIcon={<WhatsAppIcon />}
            sx={{ textTransform: "none", width: "100%" }}
            disabled={isLoading || !contact}
          >
            Iniciar Conversa
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <Button
              onClick={handleJustAdd}
              variant="outlined"
              sx={{ textTransform: "none", flexGrow: 1 }}
              disabled={isCreating}
            >
              Adicionar
            </Button>
            <Button
              onClick={handleAddAndChat}
              variant="contained"
              startIcon={isCreating ? <CircularProgress size={16} color="inherit"/> : <WhatsAppIcon />}
              sx={{ textTransform: "none", flexGrow: 1 }}
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
