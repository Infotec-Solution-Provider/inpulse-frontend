"use client";
import { useContext } from "react";
import ChatAttachmentPreview from "./chat-attachment-preview";
import { ChatContext } from "./chat-context";
import ChatHeader, { ChatContactInfoProps } from "./chat-header";
import ChatMessagesList from "./chat-messages-list";
import ChatSendMessageArea from "./chat-send-message-area";

export default function Chat({
  avatarUrl,
  name,
  customerName,
  phone,
  codErp,
  cpfCnpj,
  customerId,
  startDate,
  onClose,
}: ChatContactInfoProps & { onClose?: () => void }) {
  const { state, dispatch, isReadOnlyMode } = useContext(ChatContext);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isReadOnlyMode) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      dispatch({ type: "attach-file", file });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isReadOnlyMode) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          dispatch({ type: "attach-file", file });
        }
      }
    }
  };

  return (
    <section
      aria-label={`Conversa com ${name}`}
      className="ip-attendance-chat relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      <div className="shrink-0">
        <div className="relative">
          <ChatHeader
            avatarUrl={avatarUrl}
            name={name}
            customerName={customerName}
            phone={phone}
            codErp={codErp}
            cpfCnpj={cpfCnpj}
            customerId={customerId}
            startDate={startDate}
            onClose={onClose}
          />
          {isReadOnlyMode && (
            <div className="ip-attendance-readonly" role="status">
              Somente leitura. Esta conversa está aberta para consulta.
            </div>
          )}
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
      >
        <ChatMessagesList />
      </div>
      {!isReadOnlyMode && state?.file && !state.sendAsAudio && (
        <div className="ip-attendance-attachment-slot">
          <ChatAttachmentPreview file={state.file} />
        </div>
      )}
      {!isReadOnlyMode && (!state?.file || state.sendAsAudio) && (
        <div className="ip-attendance-composer-slot shrink-0">
          <ChatSendMessageArea />
        </div>
      )}
    </section>
  );
}
