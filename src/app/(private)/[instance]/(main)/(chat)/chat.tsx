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
    <div className="relative h-full overflow-hidden md:grid md:grid-rows-[auto_1fr_auto] rounded-md bg-white text-black dark:bg-slate-900 dark:text-white shadow-md ">
      <div className="fixed inset-x-0 top-0 z-50 md:hidden">
        <ChatHeader
          avatarUrl={avatarUrl}
          name={name}
          customerName={customerName}
          phone={phone}
        />
      </div>
      <div className="hidden md:block">
        <ChatHeader
          avatarUrl={avatarUrl}
          name={name}
          customerName={customerName}
          phone={phone}
        />
      </div>
      <div
        className="h-full overflow-y-auto pt-[68px] pb-[80px] md:pt-0 md:pb-0 md:row-start-2 md:row-end-3"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
      >
     <ChatMessagesList />
        {state?.file && !state.sendAsAudio && (
          <ChatAttachmentPreview file={state.file} />
        )}
      </div>
    {(!state?.file || state.sendAsAudio )&& (
      <>
        <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
          <ChatSendMessageArea />
        </div>
        <div className="hidden md:block">
          <ChatSendMessageArea />
        </div>
      </>
    )}
    </div>
  );
}
