"use client";
import { useState } from "react";
import ChatsMenuFilters from "./chats-menu-filters";
import ChatsMenuList from "./chats-menu-list";

export default function ChatsMenu() {
  const [isScrolling, setIsScrolling] = useState(false);
  let scrollTimer: NodeJS.Timeout;

  const handleScroll = () => {
    setIsScrolling(true);
    
    // Limpa o timer anterior se existir
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    
    // Define um novo timer para marcar o fim da rolagem
    scrollTimer = setTimeout(() => {
      setIsScrolling(false);
    }, 100);
  };

  return (
    <aside className="flex flex-col h-full rounded-md bg-slate-200 text-black shadow-md dark:dark:bg-slate-800 dark:text-slate-300">
      <ChatsMenuFilters />
      <div 
        className="flex-1 min-h-0 overflow-y-auto"
        onScroll={handleScroll}
      >
        <ChatsMenuList isScrolling={isScrolling} />
      </div>
    </aside>
  );
}
