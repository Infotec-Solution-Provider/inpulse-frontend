"use client";
import ChatHeader, { ChatContactInfoProps } from "./chat-header";
import ChatSendMessageArea from "./chat-send-message-area";
import ChatMessagesList from "./chat-messages-list";
import { ChatContext } from "./chat-context";
import { useContext } from "react";
import ChatAttachmentPreview from "./chat-attachment-preview";

export default function Chat({ avatarUrl, name }: ChatContactInfoProps) {
  const { state } = useContext(ChatContext);

  return (
    <div className="grid grid-rows-[auto_1fr] overflow-hidden rounded-md bg-slate-900 drop-shadow-md">
      <ChatHeader avatarUrl={avatarUrl} name={name} />
      <div className="relative grid grid-rows-[1fr_auto] overflow-hidden">
        <ChatMessagesList />
        <ChatSendMessageArea />
        {state.file && <ChatAttachmentPreview file={state.file} />}
      </div>
    </div>
  );
}
