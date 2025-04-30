import { createContext, ReactNode, useContext, useId, useReducer } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import messageFormReducer, {
  ChangeMessageDataAction,
  SendMessageDataState,
} from "@/lib/reducers/message-form.reducer";
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
};

export const ChatContext = createContext({} as IChatContext);

export default function ChatProvider({ children }: ChatProviderProps) {
  const { sendMessage, currentChat } = useContext(WhatsappContext);
  const { sendInternalMessage } = useContext(InternalChatContext);
  const [state, dispatch] = useReducer(messageFormReducer, initialState);

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
