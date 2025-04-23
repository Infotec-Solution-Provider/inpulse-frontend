import filesService from "@/lib/services/files.service";
import { ReactNode, useContext, useMemo } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import { AppContext } from "../../app-context";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface MessageFileProps {
  fileName: string;
  fileType: string;
  fileSize: string;
  fileId: number;
}

export default function MessageFile({ fileName, fileType, fileSize, fileId }: MessageFileProps) {
  const { closeModal, openModal } = useContext(AppContext);

  const handleClick = (element: ReactNode) => {
    openModal(
      <div className="flex flex-col gap-2 bg-slate-800 p-2">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg">Visualizando mídia</h2>
          <IconButton onClick={closeModal} className="w-max">
            <CloseIcon />
          </IconButton>
        </header>
        <div className="max-h-[44rem] max-w-[1/2]">{element}</div>
      </div>,
    );
  };

  const fileComponent = useMemo(() => {
    const url = filesService.getFileDownloadUrl(fileId);

    if (fileType.includes("image")) {
      const onClickImage = () => {
        handleClick(<img src={url} alt={fileName} className="contain max-h-[44rem] max-w-[1/2]" />);
      };

      return (
        <img
          src={url}
          alt={fileName}
          className="max-h-[20rem] max-w-[40rem] cursor-zoom-in"
          onClick={onClickImage}
        />
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
    };

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex h-16 w-52 items-center justify-center gap-2 hover:text-indigo-500"
      >
        <DownloadIcon />
        <p> ({fileSizeText()})</p>
      </a>
    );
  }, [fileId, fileName, fileType, fileSize]);

  return <div>{fileComponent}</div>;
}
