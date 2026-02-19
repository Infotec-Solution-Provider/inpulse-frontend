import { AuthContext } from "@/app/auth-context";
import { ReadyMessage } from "@in.pulse-crm/sdk";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { DetailedInternalChat, InternalChatContext } from "../../internal-context";
import { DetailedChat, WhatsappContext } from "../../whatsapp-context";
import { useReadyMessagesContext } from "./ready-messages-context";

interface Props {
  chat: DetailedChat | DetailedInternalChat;
  onClose: () => void;
}

function isWhatsappChat(chat: any): chat is DetailedChat {
  return "chatType" in chat;
}

export const QuickMessage = ({ chat, onClose }: Props) => {
  const { readyMessages, replaceVariables, fetchReadyMessages } = useReadyMessagesContext();
  const { user } = useContext(AuthContext);
  const { sendMessage: sendWppMessage } = useContext(WhatsappContext);
  const { sendInternalMessage } = useContext(InternalChatContext);

  const [selectedMessage, setSelectedMessage] = useState<ReadyMessage | null>(null);
  const [previewMessage, setPreviewMessage] = useState<ReadyMessage | null>(null);

  const currentSaudation = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const baseValues = {
    currentSaudation: currentSaudation(),
    operatorName: user?.NOME || "",
    operatorNameExibition: user?.NOME_EXIBICAO || user?.NOME || "",
  };

  const chatValues = isWhatsappChat(chat)
    ? {
        customerCnpj: chat.customer?.CPF_CNPJ || "",
        customerFirstName: chat.customer?.FANTASIA?.split(" ")[0] || "",
        customerFullName: chat.customer?.RAZAO || "",
        customerRazao: chat.customer?.RAZAO || "",
      }
    : {
        groupName: chat.groupName || "",
        customerCnpj: "",
        customerFirstName: "",
        customerFullName: "",
        customerRazao: "",
      };

  const text = replaceVariables({
    message: selectedMessage?.message || "",
    values: {
      ...baseValues,
      ...chatValues,
    },
  });

  const handleSendMessage = async () => {
    if (!selectedMessage || !user) {
      toast.error("Falha ao enviar mensagem");
      return;
    }

    try {
      if (chat.chatType === "wpp") {
        await sendWppMessage(chat.contact?.phone ?? "", {
          chatId: chat.id,
          contactId: chat.contactId ?? 0,
          text,
          ...(selectedMessage.fileId
            ? {
                fileId: selectedMessage.fileId,
              }
            : {}),
        });
      } else {
        await sendInternalMessage({
          chatId: chat.id,
          text,
          fileId: selectedMessage.fileId || undefined,
        });
      }

      toast.success("Mensagem enviada com sucesso!");
      onClose();
    } catch {
      toast.error("Erro ao enviar mensagem");
    }
  };

  useEffect(() => {
    fetchReadyMessages();
  }, []);

  return (
    <>
      {/* ===== MODAL PRINCIPAL ===== */}
      <Dialog open onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Mensagens rápidas
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {readyMessages?.length ? (
            <List>
              {readyMessages.map((msg) => (
                <ListItem
                  key={msg.id}
                  disablePadding
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: selectedMessage?.id === msg.id ? "primary.main" : "divider",
                    backgroundColor:
                      selectedMessage?.id === msg.id ? "action.selected" : "background.paper",
                  }}
                >
                  <ListItemButton onClick={() => setSelectedMessage(msg)}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500} color="text.primary" noWrap>
                          {msg.title}
                        </Typography>
                      }
                    />
                  </ListItemButton>

                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => setPreviewMessage(msg)}
                      sx={{ color: "text.secondary" }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhuma mensagem cadastrada.
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleSendMessage} disabled={!selectedMessage} variant="contained">
            Enviar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== MODAL DE VISUALIZAÇÃO ===== */}
      <Dialog
        open={!!previewMessage}
        onClose={() => setPreviewMessage(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {previewMessage?.title}
          <IconButton onClick={() => setPreviewMessage(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box
            sx={{
              whiteSpace: "pre-wrap",
              fontSize: 14,
              color: "text.primary",
              backgroundColor: "background.default",
              padding: 1.5,
              borderRadius: 1,
            }}
          >
            {replaceVariables({
              message: previewMessage?.message || "",
              values: {
                ...baseValues,
                ...chatValues,
              },
            })}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
