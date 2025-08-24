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
import { useContext } from "react";
import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { useTheme } from "@mui/material/styles";

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
  const { startChatByContactId } = useContext(WhatsappContext);
  const theme = useTheme();

  const handleStartConversation = () => {
    if (!contact) return;
    startChatByContactId(contact.id);
    onClose();
  };

  const companyName = chat?.customer?.FANTASIA || chat?.customer?.RAZAO;

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
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Detalhes do Contato
        </Typography>
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 100,
            }}
          >
            <CircularProgress />
          </Box>
        ) : contact ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: "bold", flexGrow: 1 }}>
                {contact.name}
              </Typography>

              {chat?.avatarUrl ? (
                <Avatar src={chat.avatarUrl} alt={contact.name || ""} sx={avatarStyles} />
              ) : (
                <Avatar alt={contact.name || ""} sx={avatarStyles}>
                  {contact.name ? contact.name.charAt(0).toUpperCase() : <PersonIcon />}
                </Avatar>
              )}
            </Box>

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <PhoneIphoneIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2">{Formatter.phone(contact.phone)}</Typography>
              </Box>

              {chat?.customer && (
                <Box mt={1}>
                  {companyName && (
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <BusinessIcon color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">{companyName}</Typography>
                    </Box>
                  )}

                  {chat.customer.CPF_CNPJ && (
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <BadgeIcon color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">{chat.customer.CPF_CNPJ}</Typography>
                    </Box>
                  )}

                  {chat.customer.COD_ERP && (
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <ArticleIcon color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">Cód. ERP: {chat.customer.COD_ERP}</Typography>
                    </Box>
                  )}
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

      <DialogActions sx={{ p: "8px 16px", display: "block" }}>
        <Button
          onClick={handleStartConversation}
          variant="contained"
          startIcon={<WhatsAppIcon />}
          sx={{ textTransform: "none", width: "100%" }}
          disabled={isLoading || !contact}
        >
          Conversar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
