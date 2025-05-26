import { WppMessageStatus } from "@in.pulse-crm/sdk";
import MessageFile from "./message-file";
import { liStyleVariants, msgStyleVariants, QuotedMessageProps, statusComponents } from "./message";
import { IconButton } from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";

interface MessageProps {
  id: number;
  style: "received" | "sent" | "system";
  sentBy: string;
  groupFirst: boolean;
  text: string;
  date: Date;
  status?: WppMessageStatus | null;
  fileId?: number | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
  quotedMessage?: QuotedMessageProps | null;
  onQuote?: () => void;
}

export default function GroupMessage({
  id,
  style,
  text,
  date,
  status,
  fileId,
  fileName,
  fileType,
  fileSize,
  groupFirst,
  sentBy,
  quotedMessage,
  onQuote,
}: MessageProps) {
  return (
    <li
      id={String(id)}
      className={`w-full ${liStyleVariants[style]} group flex items-center gap-2`}
    >
      <div
        className={`flex flex-col items-center gap-2 p-2 ${msgStyleVariants[style]} w-max max-w-[66%] rounded-md`}
      >
        <div className="flex w-full flex-col gap-1">
          {quotedMessage && (
            <div
              className={`flex w-full flex-col gap-1 rounded-sm border-l-2 bg-slate-600/50 p-2 ${quotedMessage.style === "sent" ? "border-indigo-600" : "border-orange-600"}`}
            >
              <h2
                className={`${quotedMessage.style === "sent" ? "text-indigo-400" : "text-orange-400"}`}
              >
                {quotedMessage.style === "sent" ? "Você" : quotedMessage.author || ""}
              </h2>
              <div className="w-full text-slate-200">
                {quotedMessage.text.split("\n").map((line, index) => (
                  <p key={index} className="max-w-[100%] break-words text-sm">
                    {line}
                  </p>
                ))}
              </div>

              {quotedMessage.fileId && (
                <MessageFile
                  fileId={quotedMessage.fileId}
                  fileName={quotedMessage.fileName || ""}
                  fileType={quotedMessage.fileType || ""}
                  fileSize={fileSize || ""}
                />
              )}
            </div>
          )}

          {groupFirst && <h2 className="text-xs font-bold text-indigo-300">{sentBy}</h2>}
          <div className="w-full text-slate-200">
            {text.split("\n").map((line, index) => (
              <p key={index} className="max-w-[100%] break-words text-sm">
                {line}
              </p>
            ))}
          </div>

          {fileId && (
            <MessageFile
              fileId={fileId}
              fileName={fileName || ""}
              fileType={fileType || ""}
              fileSize={fileSize || ""}
            />
          )}

          <div className="flex items-center gap-2">
            {style !== "system" && status && statusComponents[status]}
            <p className="text-xs text-slate-300">{date.toLocaleString()}</p>
          </div>
        </div>
      </div>
      {style !== "system" && (
        <IconButton
          className="invisible group-hover:visible"
          size="small"
          color="primary"
          title="Responder"
          onClick={onQuote}
        >
          <ReplyIcon />
        </IconButton>
      )}
    </li>
  );
}
