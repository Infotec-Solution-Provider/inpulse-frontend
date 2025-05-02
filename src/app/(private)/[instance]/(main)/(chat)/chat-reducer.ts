export interface SendMessageDataState {
  text: string;
  file?: File;
  fileId?: number;
  sendAsAudio: boolean;
  sendAsDocument: boolean;
  isEmojiMenuOpen: boolean;
}

type ChangeTextAction = { type: "change-text"; text: string };
type AddEmojiAction = { type: "add-emoji"; emoji: string };
type AttachFileAction = { type: "attach-file"; file: File };
type AttachFileIdAction = { type: "attach-file-id"; fileId: number };
type SetAudioAction = { type: "set-audio"; file: File };
type RemoveFileAction = { type: "remove-file" };
type ToggleEmojiMenuAction = { type: "toggle-emoji-menu" };
type ResetAction = { type: "reset" };

export type ChangeMessageDataAction =
  | ChangeTextAction
  | AddEmojiAction
  | AttachFileAction
  | AttachFileIdAction
  | SetAudioAction
  | RemoveFileAction
  | ToggleEmojiMenuAction
  | ResetAction;

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
    case "attach-file":
      isDocument = !["video", "image"].some((value) => action.file.type.includes(value));

      return {
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        text: state.text,
        file: action.file,
        isEmojiMenuOpen: false,
      };
    case "attach-file-id":
      return {
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        text: state.text,
        fileId: action.fileId,
        isEmojiMenuOpen: false,
      };
    case "set-audio":
      isAudio = true;

      return {
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        text: state.text,
        file: action.file,
        isEmojiMenuOpen: false,
      };
    case "remove-file":
      return {
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        text: state.text,
        isEmojiMenuOpen: false,
      };
    case "toggle-emoji-menu":
      return {
        ...state,
        isEmojiMenuOpen: !state.isEmojiMenuOpen,
      };
    default:
      return {
        ...state,
        text: "",
        file: undefined,
        fileId: undefined,
        sendAsAudio: false,
        sendAsDocument: false,
        isEmojiMenuOpen: false,
      };
  }
}
