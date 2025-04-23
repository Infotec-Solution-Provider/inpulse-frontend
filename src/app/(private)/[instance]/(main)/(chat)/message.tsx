import { WppMessageStatus } from "@in.pulse-crm/sdk";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DownloadDoneIcon from "@mui/icons-material/DownloadDone";
import ErrorIcon from "@mui/icons-material/Error";
import { ReactNode } from "react";
import MessageFile from "./message-file";

interface MessageProps {
  style: "received" | "sent" | "system";
  text: string;
  date: Date;
  status?: WppMessageStatus | null;
  fileId?: number | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
}

const variants = {
  received: "bg-slate-900 mr-auto rounded-bl-none",
  sent: "bg-green-900 ml-auto rounded-br-none",
  system: "bg-yellow-800 mx-auto",
};

const statusComponents: Record<WppMessageStatus, ReactNode> = {
  PENDING: <AccessTimeIcon className="text-slate-300" />,
  SENT: <DoneIcon className="text-slate-300" />,
  RECEIVED: <DoneAllIcon className="text-slate-300" />,
  READ: <DoneAllIcon className="text-blue-300" />,
  DOWNLOADED: <DownloadDoneIcon className="text-blue-300" />,
  ERROR: <ErrorIcon className="text-red-300" />,
};

export default function Message({
  style,
  text,
  date,
  status,
  fileId,
  fileName,
  fileType,
  fileSize,
}: MessageProps) {
  return (
    <li className={`flex items-center gap-2 p-2 ${variants[style]} w-max max-w-[66%] rounded-md`}>
      <div className="flex flex-col gap-1">
        <p className="text-slate-200">{text}</p>

        {fileId && (
          <MessageFile
            fileId={fileId}
            fileName={fileName || ""}
            fileType={fileType || ""}
            fileSize={fileSize || ""}
          />
        )}

        <div className="flex items-center gap-2">
          {status && statusComponents[status]}
          <p className="text-xs text-slate-300">{date.toLocaleString()}</p>
        </div>
      </div>
    </li>
  );
}
