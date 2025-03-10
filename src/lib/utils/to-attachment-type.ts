export default function toAttachmentType(fileType: string) {
	if (fileType.includes("image")) return "Imagem";
	if (fileType.includes("audio")) return "Áudio";
	if (fileType.includes("video")) return "Vídeo";

	return "Documento";
}
