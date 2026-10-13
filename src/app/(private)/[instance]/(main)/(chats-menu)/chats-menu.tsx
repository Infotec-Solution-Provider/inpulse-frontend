"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";
import TelephoneDialerCard from "./telephone-dialer-card";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { useWhatsappChatList } from "../../whatsapp-chat-list-context";
import { TelephonyPanelSlot } from "@/lib/telephony/telephony-panel";
import ConversationSidebar from "./conversation-sidebar";

export default function ChatsMenu() {
  const { parameters } = useWhatsappChatList();
  const showTelephonyDialer = isFeatureEnabled(parameters, FEATURE_FLAGS.telephonyDialer);

  return (
    <ConversationSidebar
      filters={<ChatsMenuFilters />}
      telephony={
        showTelephonyDialer ? (
          <>
            <TelephonyPanelSlot className="mx-3" />
            <TelephoneDialerCard />
          </>
        ) : undefined
      }
    >
      <ChatsMenuList />
    </ConversationSidebar>
  );
}
