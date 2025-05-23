import { createContext, ReactNode, useContext, useReducer } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import ChatReducer, {
  ChangeMessageDataAction,
  SendMessageDataState,
} from "@/app/(private)/[instance]/(main)/(chat)/chat-reducer";
import { InternalChatContext } from "../../internal-context";

interface IChatContext {
  state: SendMessageDataState;
  dispatch: React.Dispatch<ChangeMessageDataAction>;
  sendMessage: () => void;
}

interface ChatProviderProps {
  children: ReactNode;
}

const initialState: SendMessageDataState = {
  text: "",
  sendAsAudio: false,
  sendAsDocument: false,
  isEmojiMenuOpen: false,
};

export const ChatContext = createContext({} as IChatContext);

export default function ChatProvider({ children }: ChatProviderProps) {
  const { sendMessage, currentChat } = useContext(WhatsappContext);
  const { sendInternalMessage } = useContext(InternalChatContext);
  const [state, dispatch] = useReducer(ChatReducer, initialState);

  const handleSendMessage = () => {
    if (currentChat && currentChat.chatType === "wpp" && currentChat.contact) {
      sendMessage(currentChat.contact.phone, {
        ...state,
        contactId: currentChat.contact.id,
        chatId: currentChat.id,
      });
    }

    if (currentChat && currentChat.chatType === "internal") {
      sendInternalMessage({ ...state, chatId: currentChat.id });
    }

    dispatch({ type: "reset" });
  };

  return (
    <ChatContext.Provider
      value={{
        state,
        dispatch,
        sendMessage: handleSendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
