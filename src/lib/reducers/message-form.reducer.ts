export interface SendMessageDataState {
  text: string;
  file?: File;
  fileId?: number;
  sendAsAudio: boolean;
  sendAsDocument: boolean;
}

type ChangeTextAction = { type: "change-text"; text: string };
type AttachFileAction = { type: "attach-file"; file: File };
type AttachFileIdAction = { type: "attach-file-id"; fileId: number };
type SetAudioAction = { type: "set-audio"; file: File };
type RemoveFileAction = { type: "remove-file" };

export type ChangeMessageDataAction =
  | ChangeTextAction
  | AttachFileAction
  | AttachFileIdAction
  | SetAudioAction
  | RemoveFileAction;

export default function messageFormReducer(
  state: SendMessageDataState,
  action: ChangeMessageDataAction,
): SendMessageDataState {
  let isDocument = false;
  let isAudio = false;

  switch (action.type) {
    case "change-text":
      return { ...state, text: action.text };
    case "attach-file":
      isDocument = !["video", "image"].some((value) => action.file.type.includes(value));

      return {
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        text: state.text,
        file: action.file,
      };
    case "attach-file-id":
      return {
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        text: state.text,
        fileId: action.fileId,
      };
    case "set-audio":
      isAudio = true;

      return {
        sendAsAudio: isAudio,
        sendAsDocument: isDocument,
        text: state.text,
        file: action.file,
      };
    case "remove-file":
      return { sendAsAudio: isAudio, sendAsDocument: isDocument, text: state.text };
    default:
      return state;
  }
}
