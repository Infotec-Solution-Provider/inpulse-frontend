"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";
import TelephoneDialerCard from "./telephone-dialer-card";

export default function ChatsMenu() {
  return (
    <aside className="flex flex-col h-full rounded-md bg-slate-200 text-black shadow-md dark:bg-slate-800 dark:text-slate-300">
      <ChatsMenuFilters />
      <div className="sticky top-0 z-10 bg-slate-200 pt-3 dark:bg-slate-800">
        <TelephoneDialerCard />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-whatsapp">
        <ChatsMenuList />
      </div>
    </aside>
  );
}
