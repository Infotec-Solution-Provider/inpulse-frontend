import { createContext, ReactNode, useContext, useId, useReducer } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import messageFormReducer, {
  ChangeMessageDataAction,
  SendMessageDataState,
} from "@/lib/reducers/message-form.reducer";
import { InternalChatContext } from "../../internal-context";
import { AuthContext } from "@/app/auth-context";

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
  const { sendMessage, currentChat: openedChat } = useContext(WhatsappContext);
  const { sendMessageInternal, currentInternalChat: openedInternalChat } = useContext(InternalChatContext);
  const { user} = useContext(AuthContext);

  const [state, dispatch] = useReducer(messageFormReducer, initialState);

  const handleSendMessage = () => {
    if (openedChat && openedChat.contact) {
      sendMessage(openedChat.contact.phone, {
        ...state,
        contactId: openedChat.contact.id,
        chatId: openedChat.id,
      });
    }
    if (openedInternalChat && openedInternalChat.contact) {
      sendMessageInternal( openedInternalChat.contact.id,user, state.text)
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
