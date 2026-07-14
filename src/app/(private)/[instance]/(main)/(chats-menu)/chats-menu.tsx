"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";
import TelephoneDialerCard from "./telephone-dialer-card";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { useWhatsappContext } from "../../whatsapp-context";

export default function ChatsMenu() {
  const { parameters } = useWhatsappContext();
  const showTelephonyDialer = isFeatureEnabled(parameters, FEATURE_FLAGS.telephonyDialer);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-slate-200 text-black dark:bg-slate-800 dark:text-slate-300 md:rounded-md md:shadow-md">
      <ChatsMenuFilters />
      {showTelephonyDialer && (
        <div className="sticky top-0 z-10 bg-slate-200 pt-3 dark:bg-slate-800">
          <TelephoneDialerCard />
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-whatsapp">
        <ChatsMenuList />
      </div>
    </aside>
  );
}
