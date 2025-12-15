import { WhatsappClient, WppMessage } from "@in.pulse-crm/sdk";
import { safeNotification } from "@/lib/utils/notifications";
import { Formatter } from "@in.pulse-crm/utils";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface ReceiveMessageCallbackProps {
  message: WppMessage;
}

const types: Record<string, string> = {
  image: "Enviou uma imagem.",
  video: "Enviou um vídeo.",
  audio: "Enviou um áudio.",
  ptt: "Enviou uma mensagem de voz.",
  document: "Enviou um documento.",
  file: "Enviou um arquivo.",
};

// Sistema de debounce para notificações
const notificationQueue: Map<number, { messages: WppMessage[]; timeout: NodeJS.Timeout }> = new Map();
let lastSoundPlayedAt = 0;
const SOUND_COOLDOWN = 2000; // 2 segundos entre sons
const NOTIFICATION_DELAY = 2000; // Aguarda 2 segundos para agrupar mensagens

function playNotificationSound() {
  if (typeof window === "undefined") return;
  
  const now = Date.now();
  if (now - lastSoundPlayedAt < SOUND_COOLDOWN) {
    return; // Não toca o som se já tocou recentemente
  }
  
  lastSoundPlayedAt = now;
  const audio = new Audio("/notification-sound.mp3");
  audio.volume = 0.5;
  audio.play().catch((error) => {
    console.log("Não foi possível tocar o som da notificação:", error);
  });
}

function showGroupedNotification(contactId: number, messages: WppMessage[], contactName: string, phone: string) {
  const messageCount = messages.length;
  const lastMessage = messages[messages.length - 1];
  
  if (messageCount === 1) {
    const isTextMsg = ["chat", "text"].includes(lastMessage.type);
    safeNotification(contactName || Formatter.phone(phone), {
      body: isTextMsg ? lastMessage.body : types[lastMessage.type] || "Enviou um arquivo",
      icon: HorizontalLogo.src,
    });
  } else {
    safeNotification(contactName || Formatter.phone(phone), {
      body: `${messageCount} novas mensagens`,
      icon: HorizontalLogo.src,
    });
  }
  
  playNotificationSound();
}

export default function ReceiveMessageHandler(
  api: WhatsappClient,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  chatRef: RefObject<DetailedChat | DetailedInternalChat | null>,
  chats: DetailedChat[],
) {
  return ({ message }: ReceiveMessageCallbackProps) => {
    if (!message.from.startsWith("me") && !message.from.startsWith("system")) {
      const matchedChat = chats.find((chat) => {
        return chat.contactId === message.contactId;
      });
      const parts = message.from.split(":");
      let raw = "";
      if (parts.length === 3) {
        raw = parts[2];
      } else if (parts.length === 2) {
        raw = parts[1];
      }
      const phone = raw.split("@")[0].replace(/\D/g, "");
      const contactName = matchedChat?.contact?.name;
      const contactId = message.contactId || 0;

      // Limpar timeout anterior se existir
      const existing = notificationQueue.get(contactId);
      if (existing) {
        clearTimeout(existing.timeout);
        existing.messages.push(message);
      } else {
        notificationQueue.set(contactId, {
          messages: [message],
          timeout: null as any,
        });
      }

      // Configurar novo timeout para mostrar notificação agrupada
      const queueItem = notificationQueue.get(contactId)!;
      queueItem.timeout = setTimeout(() => {
        const item = notificationQueue.get(contactId);
        if (item) {
          showGroupedNotification(contactId, item.messages, contactName || "", phone);
          notificationQueue.delete(contactId);
        }
      }, NOTIFICATION_DELAY);
    }

    setMessages((prev) => {
      const newMessages = { ...prev };
      const contactId = message.contactId || 0;

      if (!newMessages[contactId]) {
        newMessages[contactId] = [];
      }

      const findIndex = newMessages[contactId].findIndex((m) => m.id === message.id);
      if (findIndex === -1) {
        newMessages[contactId].push(message);
      } else {
        newMessages[contactId][findIndex] = message;
      }

      return newMessages;
    });

    const x = chatRef.current;
    setChats((prev) =>
      prev
        .map((chat) => {
          if (chat.contactId === message.contactId && x) {
            return {
              ...chat,
              isUnread: x.chatType === "wpp" && x.contactId !== message.contactId,
              lastMessage: message,
            };
          }

          return chat;
        })
        .sort((a, b) =>
          (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
        ),
    );

    if (x && x.chatType === "wpp" && x.contactId === message.contactId) {
      setCurrentChatMessages((prev) => {
        const newMessages = [...prev];
        const i = newMessages.findIndex((m) => m.id === message.id);
        if (i === -1) {
          newMessages.push(message);
        } else {
          newMessages[i] = message;
        }

        return newMessages;
      });

      // TODO: Change the logic to only update the received message;
      if (message.to.startsWith("me") && message.status !== "READ" && message.contactId) {
        api.markContactMessagesAsRead(message.contactId || 0);
      }
    }
  };
}
