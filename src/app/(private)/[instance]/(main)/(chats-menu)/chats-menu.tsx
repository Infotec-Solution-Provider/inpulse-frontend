"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";
import TelephoneDialerCard from "./telephone-dialer-card";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { useWhatsappChatList } from "../../whatsapp-chat-list-context";
import { TelephonyPanelSlot } from "@/lib/telephony/telephony-panel";
import ConversationSidebar from "./conversation-sidebar";

interface ChatsMenuProps {
  integrated?: boolean;
  appointmentHost?: HTMLDivElement | null;
  onAppointmentOpenChange?: (open: boolean) => void;
  onAppointmentFinished?: () => void;
}

export default function ChatsMenu({
  integrated = false,
  appointmentHost,
  onAppointmentOpenChange,
  onAppointmentFinished,
}: ChatsMenuProps) {
  const { parameters } = useWhatsappChatList();
  const showTelephonyDialer = isFeatureEnabled(parameters, FEATURE_FLAGS.telephonyDialer);

  return (
    <ConversationSidebar
      integrated={integrated}
      filters={<ChatsMenuFilters />}
      telephony={
        showTelephonyDialer ? (
          <>
            {!integrated && <TelephonyPanelSlot className="attendance-telephony-phone-slot" />}
            <TelephoneDialerCard
              inlineHost={integrated ? appointmentHost : undefined}
              onOpenChange={onAppointmentOpenChange}
              onFinished={onAppointmentFinished}
            />
          </>
        ) : undefined
      }
    >
      <ChatsMenuList />
    </ConversationSidebar>
  );
}
