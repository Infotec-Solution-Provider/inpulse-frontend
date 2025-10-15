import { Button, IconButton, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import DescriptionIcon from "@mui/icons-material/Description";
import { useRef, useState } from "react";

interface FilePickerProps {
  selectedFile: File | null;
  onChangeFile: (file: File | null) => void;
  existingFilePreview?: string | null;
}

// Helper para determinar o tipo de arquivo
const getFileType = (file: File | null): "image" | "video" | "audio" | "document" | null => {
  if (!file) return null;
  const type = file.type;
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "document";
};

// Helper para determinar o tipo de arquivo pela URL/extensão
const getFileTypeFromUrl = (url: string): "image" | "video" | "audio" | "document" => {
  const ext = url.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "ogg", "mov", "avi"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio";
  return "document";
};

// Componente de ícone do tipo de arquivo
const FileTypeIcon = ({ fileType, size = "medium" }: { fileType: "image" | "video" | "audio" | "document"; size?: "small" | "medium" | "large" }) => {
  const iconProps = { fontSize: size };
  
  switch (fileType) {
    case "image":
      return <ImageIcon className="text-green-500" {...iconProps} />;
    case "video":
      return <VideoFileIcon className="text-purple-500" {...iconProps} />;
    case "audio":
      return <AudioFileIcon className="text-blue-500" {...iconProps} />;
    default:
      return <DescriptionIcon className="text-orange-500" {...iconProps} />;
  }
};

export default function FilePicker({ selectedFile, onChangeFile, existingFilePreview }: FilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChangeFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    onChangeFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const currentFileType = selectedFile ? getFileType(selectedFile) : null;
  const existingFileType = existingFilePreview ? getFileTypeFromUrl(existingFilePreview) : null;

  const displayPreview = selectedFile ? filePreview : existingFilePreview;
  const displayFileType = selectedFile ? currentFileType : existingFileType;

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="outlined"
        onClick={() => fileInputRef.current?.click()}
        startIcon={<AttachFileIcon />}
        sx={{ minWidth: 120 }}
      >
        Anexar
      </Button>

      {(selectedFile || existingFilePreview) && (
        <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
          {/* Ícone ou preview do arquivo */}
          <div className="flex h-8 w-8 items-center justify-center">
            {displayFileType === "image" && displayPreview ? (
              <img
                src={displayPreview}
                alt="Preview"
                className="h-8 w-8 rounded object-cover"
              />
            ) : displayFileType === "video" && displayPreview ? (
              <video
                src={displayPreview}
                className="h-8 w-8 rounded object-cover"
              />
            ) : displayFileType ? (
              <FileTypeIcon fileType={displayFileType} size="small" />
            ) : null}
          </div>

          {/* Nome do arquivo */}
          <Typography
            variant="body2"
            noWrap
            sx={{ maxWidth: 200 }}
            className="text-gray-800 dark:text-white"
          >
            {selectedFile?.name || "Arquivo existente"}
          </Typography>

          {/* Botão de remover */}
          <IconButton
            size="small"
            onClick={handleRemoveFile}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Remover arquivo"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
      />
    </div>
  );
}