"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";

export default function ChatsMenu() {
  return (
    <aside className="grid grid-rows-[auto_1fr] flex-col rounded-md bg-slate-200 text-black shadow-md dark:bg-slate-800 dark:text-slate-300">
      <ChatsMenuFilters />
      <ChatsMenuList />
    </aside>
  );
}
