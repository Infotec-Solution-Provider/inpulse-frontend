
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import DescriptionIcon from "@mui/icons-material/Description";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import HeadsetMicRoundedIcon from "@mui/icons-material/HeadsetMicRounded";

export function getTypeTextIcon(type: string) {
  // pick only the first part of the type, before the slash
  const typeParts = type.split("/");
  const typeWithoutSlash = typeParts[0].toLowerCase();

  switch (typeWithoutSlash) {
    case "image":
      return (
        <p>
          <CameraAltIcon className="mr-1" /> Foto
        </p>
      );
    case "video" /*  */:
      return (
        <p>
          <VideocamIcon className="mr-1" /> Video
        </p>
      );
    case "audio":
      return (
        <p>
          <HeadsetMicRoundedIcon className="mr-1" /> Audio
        </p>
      );
    case "ptt":
      return (
        <p>
          <MicIcon className="mr-1" /> Mensagem de voz
        </p>
      );
    case "document":
      return (
        <p>
          <DescriptionIcon className="mr-1" /> Documento
        </p>
      );
    default:
      return (
        <p>
          <AttachFileIcon className="mr-1" /> Arquivo
        </p>
      );
  }
}