export interface SendMessageDataState {
  attemptKey?: string;
  attemptClientId?: number;
  mentions?: MentionableUser[];
  text: string;
  file?: File;
  fileId?: number;
  sendAsAudio: boolean;
  sendAsDocument: boolean;
  isEmojiMenuOpen: boolean;
  quotedId?: number | null;
  forwardMode?: boolean;
  selectedMessages?: number[];
}
interface MentionableUser {
  userId: number;
  name: string;
  phone: string;
}

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
type SetMentionsAction = {
  type: "set-mentions";
  mentions: MentionableUser[];
};
type ResetAction = { type: "reset" };
type RestoreDraftAction = { type: "restore-draft"; draft: SendMessageDataState };
type SetAttemptAction = { type: "set-attempt"; key: string; clientId: number };
type AcknowledgeAction = { type: "acknowledge"; sent: SendMessageDataState };
type ToggleForwardMode = { type: "toggle-forward-mode" };
type SelectMessage = { type: "select-message"; messageId: number };
type ClearForward = { type: "clear-forward" };
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
  | RemoveQuotedMessageAction
  | SetMentionsAction
  | ToggleForwardMode
  | SelectMessage
  | ClearForward;

export type DraftAction =
  | ChangeMessageDataAction
  | RestoreDraftAction
  | SetAttemptAction
  | AcknowledgeAction;

export function sameMessageDraft(left: SendMessageDataState, right: SendMessageDataState) {
  return (
    left.text === right.text &&
    left.file === right.file &&
    left.fileId === right.fileId &&
    left.quotedId === right.quotedId &&
    left.sendAsAudio === right.sendAsAudio &&
    left.sendAsDocument === right.sendAsDocument &&
    JSON.stringify(left.mentions ?? []) === JSON.stringify(right.mentions ?? [])
  );
}

export default function ChatReducer(
  state: SendMessageDataState,
  action: DraftAction,
): SendMessageDataState {
  if (action.type === "restore-draft") return action.draft;
  if (action.type === "set-attempt")
    return { ...state, attemptKey: action.key, attemptClientId: action.clientId };
  if (action.type === "acknowledge") {
    return sameMessageDraft(state, action.sent) && state.attemptKey === action.sent.attemptKey
      ? reduceMessageDraft(state, { type: "reset" })
      : state;
  }
  const next = reduceMessageDraft(state, action);
  return sameMessageDraft(state, next)
    ? next
    : { ...next, attemptKey: undefined, attemptClientId: undefined };
}

function reduceMessageDraft(
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
    case "quote-message":
      return {
        ...state,
        quotedId: action.id,
      };
    case "set-mentions":
      return {
        ...state,
        mentions: action.mentions,
      };
    case "toggle-forward-mode":
      return {
        ...state,
        forwardMode: !state.forwardMode,
        selectedMessages: [],
      };

    case "select-message":
      return {
        ...state,
        selectedMessages: state.selectedMessages?.includes(action.messageId)
          ? state.selectedMessages.filter((id) => id !== action.messageId)
          : [...(state.selectedMessages || []), action.messageId],
      };

    case "clear-forward":
      return {
        ...state,
        forwardMode: false,
        selectedMessages: [],
      };
    case "remove-quoted-message":
      return { ...state, quotedId: undefined };
    default:
      return {
        ...state,
        text: "",
        file: undefined,
        fileId: undefined,
        mentions: [],
        quotedId: undefined,
        attemptKey: undefined,
        attemptClientId: undefined,
        sendAsAudio: false,
        sendAsDocument: false,
        isEmojiMenuOpen: false,
      };
  }
}
