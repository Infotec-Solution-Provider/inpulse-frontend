"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";

export default function ChatsMenu() {
  return (
    <aside className="flex flex-col h-full rounded-md bg-slate-200 text-black shadow-md dark:bg-slate-800 dark:text-slate-300">
      <ChatsMenuFilters />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatsMenuList />
      </div>
    </aside>
  );
}
