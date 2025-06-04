"use client";
import ChatHeader, { ChatContactInfoProps } from "./chat-header";
import ChatSendMessageArea from "./chat-send-message-area";
import ChatMessagesList from "./chat-messages-list";
import { ChatContext } from "./chat-context";
import { useContext } from "react";
import ChatAttachmentPreview from "./chat-attachment-preview";

export default function Chat({ avatarUrl, name, customerName, phone }: ChatContactInfoProps) {
  const { state, dispatch } = useContext(ChatContext);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      dispatch({ type: "attach-file", file });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
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
<div className="grid grid-rows-[auto_1fr] overflow-hidden rounded-md bg-white text-black dark:bg-slate-900 dark:text-white drop-shadow-md">
      <ChatHeader avatarUrl={avatarUrl} name={name} customerName={customerName} phone={phone} />
      <div
        className="relative grid grid-rows-[1fr_auto] overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
      >
        <ChatMessagesList />
        <ChatSendMessageArea />
        {state?.file && !state.sendAsAudio && <ChatAttachmentPreview file={state.file} />}
      </div>
    </div>
  );
}
