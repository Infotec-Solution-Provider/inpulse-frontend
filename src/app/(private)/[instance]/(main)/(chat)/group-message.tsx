import { WppMessageStatus } from "@in.pulse-crm/sdk";
import MessageFile from "./message-file";
import { msgStyleVariants, statusComponents } from "./message";

interface MessageProps {
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
}

export default function GroupMessage({
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
}: MessageProps) {
  return (
    <li
      className={`flex items-center gap-2 p-2 ${msgStyleVariants[style]} w-max max-w-[66%] rounded-md ${groupFirst ? "rounded-tl-none" : ""}`}
    >
      <div className="flex flex-col gap-1">
        {groupFirst && <h2 className="text-xs font-bold text-indigo-300">{sentBy}</h2>}
        <div className="text-slate-200">
          {text.split("\n").map((line, index) => (
            <p key={index} className="break-words text-sm max-w-[60rem]">
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
    </li>
  );
}
