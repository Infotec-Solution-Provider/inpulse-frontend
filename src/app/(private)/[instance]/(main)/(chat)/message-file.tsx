import filesService from "@/lib/services/files.service";
import { useEffect, useMemo, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";

interface MessageFileProps {
  fileName: string;
  fileType: string;
  fileSize: string;
  fileId: number;
}

export default function MessageFile({
  fileName,
  fileType,
  fileSize,
  fileId,
}: MessageFileProps) {
  const fileComponent = useMemo(() => {
    const url = filesService.getFileDownloadUrl(fileId);

    if (fileType.includes("image")) {
      return (
        <img src={url} alt={fileName} className="max-h-[15rem] max-w-[40rem] object-contain" />
      );
    }

    if (fileType.includes("video")) {
      return (
        <video controls className="max-h-[15rem] max-w-[40rem] object-contain">
          <source src={url} type={fileType} />
        </video>
      );
    }

    if (fileType.includes("audio")) {
      return (
        <audio controls>
          <source src={url} type={fileType} />
        </audio>
      );
    }

    const fileSizeText = () => {
      const size = parseInt(fileSize, 10);
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex h-16 w-52 items-center justify-center gap-2 hover:text-indigo-500"
      >
        <DownloadIcon />
        <p>
          {" "}
           ({fileSizeText()})
        </p>
      </a>
    );
  }, [fileId, fileName, fileType, fileSize]);

  return (
    <div>
      {fileComponent}
    </div>
  );
}
