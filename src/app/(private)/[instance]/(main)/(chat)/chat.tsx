"use client";
import ChatHeader, { ChatContactInfoProps } from "./chat-header";
import ChatSendMessageArea from "./chat-send-message-area";
import ChatMessagesList from "./chat-messages-list";

export interface ChatProps extends ChatContactInfoProps {}

export default function Chat({
  avatarUrl,
  name,
  company,
  phone,
  cnpj,
  id,
  erpId,
  startDate,
  urgency,
}: ChatProps) {
  return (
    <div className="grid grid-rows-[6rem_1fr_4rem] overflow-hidden rounded-md bg-slate-900 drop-shadow-md">
      <ChatHeader
        avatarUrl={avatarUrl}
        name={name}
        company={company}
        phone={phone}
        cnpj={cnpj}
        id={id}
        erpId={erpId}
        startDate={startDate}
        urgency={urgency}
      />
      <ChatMessagesList />
      <ChatSendMessageArea />
    </div>
  );
}
