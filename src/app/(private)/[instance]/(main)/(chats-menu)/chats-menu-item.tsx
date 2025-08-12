import { Avatar } from "@mui/material";
import ChatsMenuItemTag from "./chats-menu-item-tag";
import { ReactNode, useMemo, useEffect, useRef, useState } from "react";

interface Tag {
  name: string;
  color: string;
}

interface ChatsMenuItemProps {
  name: string;
  avatar?: string;
  message: string | ReactNode;
  messageDate: Date | null;
  tags: { color: string; name: string }[];
  isUnread?: boolean;
  isOpen?: boolean;
  isScrolling?: boolean;
  onClick: () => void;
}

export default function ChatsMenuItem({
  name,
  avatar,
  message,
  messageDate,
  tags,
  isUnread,
  isOpen,
  onClick,
}: ChatsMenuItemProps) {
  const lastMessageDateText = useMemo(() => {
    if (!messageDate) {
      return "Nunca";
    }

    const today = new Date();
    const isMessageFromToday = messageDate.toDateString() === today.toDateString();

    if (isMessageFromToday) {
      return messageDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return messageDate.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [messageDate]);

  // Referências para controle de toque
  const touchStartRef = useRef({
    time: 0,
    x: 0,
    y: 0
  });

  // Função para lidar com o início do toque
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      time: Date.now(),
      x: touch.clientX,
      y: touch.clientY
    };
  };

  // Função para lidar com clique do mouse
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onClick === 'function') {
      onClick();
    }
  };

  // Função para lidar com toque na tela
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentTime = Date.now();
    const touchDuration = currentTime - touchStartRef.current.time;
    
    // Verifica se o toque foi muito longo (mais de 300ms)
    if (touchDuration > 300) {
      return;
    }
    
    // Verifica se houve movimento significativo
    const touch = e.changedTouches[0];
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const moveX = Math.abs(touch.clientX - startX);
    const moveY = Math.abs(touch.clientY - startY);
    
    // Se o movimento foi pequeno, considera como clique
    if (moveX < 10 && moveY < 10 && typeof onClick === 'function') {
      onClick();
    }
  };

  return (
    <li
      aria-busy={Boolean(isUnread)}
      aria-selected={Boolean(isOpen)}
      className="group relative chat-list-item"
    >
      <div
        className={`grid grid-cols-[74px_1fr] rounded-md p-3 w-full h-full touch-manipulation cursor-pointer select-none
          ${isOpen ? 'bg-white/10' : ''}
          hover:bg-indigo-500/20 active:bg-indigo-500/30
          transition-colors duration-100`}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (typeof onClick === 'function') {
              onClick();
            }
          }
        }}
        style={{
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'manipulation',
          position: 'relative',
          zIndex: 10,
        }}
        data-testid="chat-menu-item"
      >
        <div className="flex items-center mr-3">
          <Avatar alt={name} src={avatar || ""} sx={{ width: 64, height: 64 }} />
        </div>
        <div className="flex flex-col gap-1 truncate w-full">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm leading-none text-gray-900 dark:text-slate-100">{name}</p>
            <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300 group-aria-busy:text-orange-200">
              <p className="text-xs">{lastMessageDateText}</p>
              <div
                className="h-3 w-3 rounded-full bg-red-600 aria-hidden:hidden"
                aria-hidden={!Boolean(isUnread)}
              ></div>
            </div>
          </div>
          <div className="truncate text-sm text-gray-700 dark:text-slate-300 font-emoji">{message}</div>
          <div className="flex items-center justify-end gap-1">
            {tags?.map((tag) => (
              <ChatsMenuItemTag key={tag.name} name={tag.name} color={tag.color} />
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
