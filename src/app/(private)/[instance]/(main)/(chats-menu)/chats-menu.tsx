"use client";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";

export default function ChatsMenu() {
  return (
    <aside className="grid grid-rows-[auto_1fr] flex-col rounded-md bg-slate-900 text-slate-300 drop-shadow-md">
      <ChatsMenuFilters />
      <ChatsMenuList />
    </aside>
  );
}
