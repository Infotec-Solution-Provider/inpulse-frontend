import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useContext } from "react";
import { ChatContext } from "./chat-context";
import PendingSendStatus from "./pending-send-status";

export default function ChatPendingSends({
  renderedMessages = [],
  readOnly = false,
}: {
  renderedMessages?: readonly { id: number; clientId?: number | null }[];
  readOnly?: boolean;
}) {
  const { pendingSends } = useContext(ChatContext);
  // Once a message is visible, its own status icon takes over. Keep a bubble for
  // sends without a receipt, and for receipts outside the currently loaded page.
  const pending = pendingSends.filter(
    (attempt) =>
      !renderedMessages.some(
        (message) =>
          message.id === attempt.messageId &&
          (!attempt.clientId || message.clientId === attempt.clientId),
      ),
  );

  return pending.map((attempt) => (
    <li key={attempt.id} className="flex w-full justify-end" data-pending-send-id={attempt.id}>
      <div className="w-max min-w-12 max-w-[86%] rounded-md rounded-br-none bg-green-200 px-2 py-1 text-sm text-slate-800 dark:bg-green-800 dark:text-slate-200 sm:max-w-[76%] lg:max-w-[66%]">
        {attempt.snapshot.text && (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {attempt.snapshot.text}
          </p>
        )}
        {(attempt.fileName || attempt.snapshot.fileId) && (
          <p className="flex min-w-0 items-center gap-1 text-xs">
            <AttachFileIcon sx={{ fontSize: 14 }} />
            <span className="truncate">{attempt.fileName || "Anexo"}</span>
          </p>
        )}
        <div className="flex justify-end">
          <PendingSendStatus attempt={attempt} readOnly={readOnly} />
        </div>
      </div>
    </li>
  ));
}
