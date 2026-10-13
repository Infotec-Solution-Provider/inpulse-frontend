export default function shouldAutoScrollChat(isHistoryPrepend: boolean, isSelectionMode: boolean) {
  return !isHistoryPrepend && !isSelectionMode;
}
