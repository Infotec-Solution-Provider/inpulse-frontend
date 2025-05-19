import { useContext, useState } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  Typography,
  ListItemButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { AuthContext } from "@/app/auth-context";
import { ReadyMessage } from "@in.pulse-crm/sdk";
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
  const { readyMessages, replaceVariables } = useReadyMessagesContext();
  const { user } = useContext(AuthContext);
  const { sendMessage: sendWppMessage } = useContext(WhatsappContext);
  const { sendInternalMessage } = useContext(InternalChatContext);

  const [selectedMessage, setSelectedMessage] = useState<ReadyMessage | null>(null);

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
        customerCnpj: chat.customer?.CPF_CNPJ || '',
        customerFirstName: chat.customer?.FANTASIA?.split(" ")[0] || '',
        customerFullName: chat.customer?.RAZAO || '',
        customerRazao: chat.customer?.RAZAO || '',
      }
    : {
        groupName: chat.groupName || '',
        customerCnpj: '',
        customerFirstName: '',
        customerFullName: '',
        customerRazao: '',
      };

  const text = replaceVariables({
    message: selectedMessage?.TEXTO_MENSAGEM || '',
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
      if (chat.chatType ==='wpp') {
        await sendWppMessage(chat.contact?.phone ?? "", {
          chatId: chat.id,
          contactId: chat.contactId ?? 0,
          text,
          fileId: +selectedMessage.ARQUIVO_CODIGO
        });
      } else {
        await sendInternalMessage({
          chatId: chat.id,
          text,
          fileId: +selectedMessage.ARQUIVO_CODIGO
        });
      }

      toast.success("Mensagem enviada com sucesso!");
      onClose();
    } catch (err) {
      toast.error("Erro ao enviar mensagem");
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Mensagens rápidas
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {readyMessages.length ? (
          <List>
            {readyMessages.map((msg) => (
              <ListItemButton
                key={msg.CODIGO}
                selected={selectedMessage?.CODIGO === msg.CODIGO}
                onClick={() => setSelectedMessage(msg)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border:
                    selectedMessage?.CODIGO === msg.CODIGO
                      ? "1px solid #1976d2"
                      : "1px solid transparent",
                  backgroundColor:
                    selectedMessage?.CODIGO === msg.CODIGO
                      ? "rgba(25, 118, 210, 0.1)"
                      : "transparent",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.08)",
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" color="textPrimary" noWrap>
                      {msg.TEXTO_MENSAGEM}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Nenhuma mensagem cadastrada.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleSendMessage}
          disabled={!selectedMessage}
          variant="contained"
          color="primary"
        >
          Enviar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
