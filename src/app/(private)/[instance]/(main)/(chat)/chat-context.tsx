import { createContext, ReactNode, useContext, useReducer } from "react";
import { WhatsappContext } from "../../whatsapp-context";

interface SendMessageDataState {
  text: string;
  file?: File;
  fileId?: number;
  isAudio: boolean;
  isDocument: boolean;
}
type ChangeTextAction = { type: "change-text"; text: string };
type AttachFileAction = { type: "attach-file"; file: File };
type AttachFileIdAction = { type: "attach-file-id"; fileId: number };
type SetAudioAction = { type: "set-audio"; file: File };
type RemoveFileAction = { type: "remove-file" };
type MessageAction =
  | ChangeTextAction
  | AttachFileAction
  | AttachFileIdAction
  | SetAudioAction
  | RemoveFileAction;

interface IChatContext {
  state: SendMessageDataState;
  dispatch: React.Dispatch<MessageAction>;
  sendMessage: () => void;
}

interface ChatProviderProps {
  children: ReactNode;
}

const initialState: SendMessageDataState = {
  text: "",
  isAudio: false,
  isDocument: false,
};

function reducer(state: SendMessageDataState, action: MessageAction): SendMessageDataState {
  let isDocument = false;
  let isAudio = false;

  switch (action.type) {
    case "change-text":
      return { ...state, text: action.text };
    case "attach-file":
      isDocument = !["video", "image"].some((value) => action.file.type.includes(value));

      return { isAudio, isDocument, text: state.text, file: action.file };
    case "attach-file-id":
      return { isAudio, isDocument, text: state.text, fileId: action.fileId };
    case "set-audio":
      isAudio = true;
      
      return { isAudio, isDocument, text: state.text, file: action.file };
    case "remove-file":
      return { isAudio, isDocument, text: state.text };
    default:
      return state;
  }
}

export const ChatContext = createContext({} as IChatContext);

export default function ChatProvider({ children }: ChatProviderProps) {
  const { sendMessage, openedChat } = useContext(WhatsappContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleSendMessage = () => {
    if (openedChat && openedChat.contact) {
      sendMessage(openedChat.contact.phone, {
        text: state.text,
        file: state.file,
        fileId: state.fileId,
        sendAsAudio: state.isAudio,
        sendAsDocument: state.isDocument,
        contactId: openedChat.contact.id,
        chatId: openedChat.id,
      });
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
