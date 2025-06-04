"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";

export default function ChatsMenu() {
  return (
<aside className="grid grid-rows-[auto_1fr] flex-col rounded-md bg-white text-black drop-shadow-md dark:bg-slate-900 dark:text-slate-300">
      <ChatsMenuFilters />
      <ChatsMenuList />
    </aside>
  );
}
