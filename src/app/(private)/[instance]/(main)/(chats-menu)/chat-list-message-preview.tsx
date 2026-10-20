import { Camera, FileText, Headphones, Mic, Paperclip, Video, type LucideIcon } from "lucide-react";
import { UiIcon } from "@/lib/ui-system/icons";

const MEDIA_PREVIEWS: Record<string, { icon: LucideIcon; label: string }> = {
  image: { icon: Camera, label: "Foto" },
  video: { icon: Video, label: "Vídeo" },
  audio: { icon: Headphones, label: "Áudio" },
  ptt: { icon: Mic, label: "Mensagem de voz" },
  document: { icon: FileText, label: "Documento" },
};

/** Media summaries share the operational icon metrics without changing message content. */
export default function ChatListMessagePreview({ type }: { type: string }) {
  const mediaType = type.split("/")[0].toLowerCase();
  const preview = MEDIA_PREVIEWS[mediaType] ?? { icon: Paperclip, label: "Arquivo" };

  return (
    <span className="attendance-message-type">
      <UiIcon icon={preview.icon} scale="metadata" />
      <span>{preview.label}</span>
    </span>
  );
}
