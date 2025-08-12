export interface SendMessageDataState {
  text: string;
  file?: File;
  fileId?: number;
  sendAsAudio: boolean;
  sendAsDocument: boolean;
  isEmojiMenuOpen: boolean;
  quotedId?: number | null;
}

export const initialState: SendMessageDataState = {
  text: "",
  sendAsAudio: false,
  sendAsDocument: false,
  isEmojiMenuOpen: false,
};

type ChangeTextAction = { type: "change-text"; text: string };
type AddEmojiAction = { type: "add-emoji"; emoji: string };
type AttachFileAction = { type: "attach-file"; file: File };
type AttachFileIdAction = { type: "attach-file-id"; fileId: number };
type SetAudioAction = { type: "set-audio"; file: File };
type RemoveFileAction = { type: "remove-file" };
type ToggleEmojiMenuAction = { type: "toggle-emoji-menu" };
type QuoteMessageAction = {
  type: "quote-message";
  id: number;
};
type RemoveQuotedMessageAction = {
  type: "remove-quoted-message";
};

type ResetAction = { type: "reset" };

export type ChangeMessageDataAction =
  | ChangeTextAction
  | AddEmojiAction
  | AttachFileAction
  | AttachFileIdAction
  | SetAudioAction
  | RemoveFileAction
  | ToggleEmojiMenuAction
  | ResetAction
  | QuoteMessageAction
  | RemoveQuotedMessageAction;

export default function ChatReducer(
  state: SendMessageDataState,
  action: ChangeMessageDataAction,
): SendMessageDataState {
  let isDocument = false;
  let isAudio = false;

  switch (action.type) {
    case "change-text":
      return { ...state, text: action.text };
    case "add-emoji":
      return { ...state, text: state.text + action.emoji };
    case "attach-file": {
      // Detecta se é áudio pelo mime type ou extensão
      const isAudioFile = action.file.type.startsWith('audio/') ||
        [".m4a", ".ogg", ".mp3", ".wav", ".aac"].some(ext => action.file.name?.toLowerCase().endsWith(ext));
      isAudio = isAudioFile;
      isDocument = !["video", "image"].some((value) => action.file.type.includes(value)) && !isAudioFile;
      return {
        ...state,
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        file: action.file,
        text: state.text,
        isEmojiMenuOpen: false,
      };
    }    case "attach-file-id":
  return {
    ...state,
    fileId: action.fileId,
    isEmojiMenuOpen: false,
  };
    case "set-audio":
  isAudio = true;
  return {
    ...state,
    sendAsAudio: isAudio,
    sendAsDocument: false,
    file: action.file,
    isEmojiMenuOpen: false,
  };
    case "remove-file":
  return {
    ...state,
    file: undefined,
    fileId: undefined,
    sendAsAudio: false,
    sendAsDocument: false,
    isEmojiMenuOpen: false,
  };
    case "toggle-emoji-menu":
      return {
        ...state,
        isEmojiMenuOpen: !state.isEmojiMenuOpen,
      };
    case "quote-message":
      return {
        ...state,
        quotedId: action.id,
      };
    case "remove-quoted-message":
      return {
        ...state,
        quotedId: undefined,
      };
    case "reset":
      return initialState;
    default:
      return state;
  }
}
