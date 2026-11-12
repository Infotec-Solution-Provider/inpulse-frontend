import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import ChatSendMessageArea from "../../src/app/(private)/[instance]/(main)/(chat)/chat-send-message-area";
import type { WppMessage } from "../../src/lib/sdk-local";
import type { WppClient, DetailedChat } from "../../src/app/(private)/[instance]/whatsapp-context";
import {
  ChatContext,
  WhatsappContext,
  type ChatContextType,
  type WhatsappContextType,
} from "./doubles";

const available = [
  { id: 5, name: "Canal oficial", type: "GUPSHUP" },
  { id: 11, name: "Canal remoto", type: "REMOTE" },
] as WppClient[];
const makeChat = (id: number) => ({ id, contactId: id + 100, chatType: "wpp" }) as DetailedChat;
type Message = Pick<WppMessage, "id" | "clientId" | "contactId">;
let controls: {
  open: (id: number, messages?: Message[], lastMessage?: Message) => void;
  history: (messages: Message[]) => void;
  channels: (ids: number[]) => void;
  receive: (clientId: number) => void;
  internal: () => void;
};
declare global {
  interface Window {
    channelHarness: typeof controls;
  }
}

function Application() {
  const [currentChat, setCurrentChat] = useState(makeChat(1));
  const [currentChatMessages, setMessages] = useState<WppMessage[]>([]);
  const [channels, setChannels] = useState(available);
  const [selectedChannel, setSelectedChannel] = useState<WppClient | null>(available[0]);
  const chatsChannels = useRef(new Map<number, number>());
  const globalChannel = useRef(available[0]);
  const [text, setText] = useState("");
  controls = {
    open(id, messages = [], lastMessage) {
      setCurrentChat({ ...makeChat(id), lastMessage: (lastMessage as WppMessage) ?? null });
      setMessages(messages as WppMessage[]);
    },
    history(messages) {
      setMessages(messages as WppMessage[]);
    },
    channels(ids) {
      setChannels(available.filter((channel) => ids.includes(channel.id)));
    },
    receive(clientId) {
      chatsChannels.current.set(currentChat.id, clientId);
      setSelectedChannel(available.find((channel) => channel.id === clientId)!);
      setMessages((previous) => [
        ...previous,
        { id: 999, clientId, contactId: currentChat.contactId } as WppMessage,
      ]);
    },
    internal() {
      setCurrentChat({ ...makeChat(3), chatType: "internal" } as unknown as DetailedChat);
    },
  };
  window.channelHarness = controls;
  return (
    <WhatsappContext.Provider
      value={
        {
          currentChat,
          currentChatMessages,
          channels,
          selectedChannel,
          setSelectedChannel,
          chatsChannels,
          globalChannel,
          loaded: true,
          parameters: {},
        } as WhatsappContextType
      }
    >
      <ChatContext.Provider
        value={
          {
            state: { text, mentions: [], isEmojiMenuOpen: false },
            dispatch(action: { type: string; text?: string }) {
              if (action.type === "change-text") setText(action.text ?? "");
            },
            isReadOnlyMode: false,
            isSending: false,
          } as unknown as ChatContextType
        }
      >
        <output data-testid="selected">{selectedChannel?.id ?? "none"}</output>
        <ChatSendMessageArea />
      </ChatContext.Provider>
    </WhatsappContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(<Application />);
