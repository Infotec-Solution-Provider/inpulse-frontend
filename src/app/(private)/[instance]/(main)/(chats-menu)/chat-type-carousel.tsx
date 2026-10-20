"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ShowingMessagesType } from "@/lib/reducers/chats-filter.reducer";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";

interface ChatTypeCarouselProps {
  options: { value: ShowingMessagesType; label: string }[];
  value: ShowingMessagesType;
  onChange: (value: ShowingMessagesType) => void;
}

export default function ChatTypeCarousel({ options, value, onChange }: ChatTypeCarouselProps) {
  const viewportId = useId();
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const selectedValue = useRef(value);
  selectedValue.current = value;
  const [navigation, setNavigation] = useState({ visible: false, previous: false, next: false });
  const optionKey = options.map((option) => option.value).join(",");

  const updateNavigation = useCallback(() => {
    if (!root.current || !viewport.current || !track.current) return;
    const next = {
      visible: track.current.scrollWidth > root.current.clientWidth + 1,
      previous: viewport.current.scrollLeft > 1,
      next:
        viewport.current.scrollLeft + viewport.current.clientWidth <
        viewport.current.scrollWidth - 1,
    };
    setNavigation((current) =>
      current.visible === next.visible &&
      current.previous === next.previous &&
      current.next === next.next
        ? current
        : next,
    );
  }, []);

  const reveal = useCallback((button: HTMLButtonElement, animated = false) => {
    const element = viewport.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const option = button.getBoundingClientRect();
    const delta =
      option.left < bounds.left + 6
        ? option.left - bounds.left - 6
        : option.right > bounds.right - 6
          ? option.right - bounds.right + 6
          : 0;
    if (delta)
      element.scrollBy({
        left: delta,
        behavior:
          animated && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "smooth"
            : "instant",
      });
  }, []);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      const selected = track.current?.querySelector<HTMLButtonElement>(
        `[data-value="${selectedValue.current}"]`,
      );
      if (selected) reveal(selected);
      updateNavigation();
    });
    for (const element of [root.current, viewport.current, track.current]) {
      if (element) observer.observe(element);
    }
    updateNavigation();
    return () => observer.disconnect();
  }, [optionKey, reveal, updateNavigation]);

  useLayoutEffect(() => {
    const selected = track.current?.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
    if (selected) reveal(selected);
    updateNavigation();
  }, [value, optionKey, navigation.visible, reveal, updateNavigation]);

  const move = (direction: -1 | 1) => {
    if (!viewport.current || !track.current) return;
    const bounds = viewport.current.getBoundingClientRect();
    const buttons = Array.from(track.current.querySelectorAll<HTMLButtonElement>("button"));
    const target =
      direction === 1
        ? buttons.find((button) => button.getBoundingClientRect().right > bounds.right - 6)
        : buttons.reverse().find((button) => button.getBoundingClientRect().left < bounds.left + 6);
    if (target) reveal(target, true);
  };

  return (
    <div
      ref={root}
      className="attendance-type-carousel"
      role="group"
      aria-roledescription="carrossel"
      aria-label="Tipos de conversa"
      data-overflow={navigation.visible}
    >
      {navigation.visible && (
        <OperationalIconButton
          className="attendance-type-carousel-arrow"
          label="Tipos de conversa anteriores"
          aria-controls={viewportId}
          aria-disabled={!navigation.previous}
          onClick={() => {
            if (navigation.previous) move(-1);
          }}
        >
          <UiIcon icon={ChevronLeft} scale="row" />
        </OperationalIconButton>
      )}
      <div
        ref={viewport}
        id={viewportId}
        className="attendance-type-carousel-viewport"
        onScroll={updateNavigation}
      >
        <div ref={track} className="attendance-conversation-types">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              data-value={option.value}
              aria-pressed={value === option.value}
              onClick={() => onChange(option.value)}
              onFocus={(event) => reveal(event.currentTarget)}
              onKeyDown={(event) => {
                let nextIndex: number;
                if (event.key === "ArrowRight") nextIndex = Math.min(index + 1, options.length - 1);
                else if (event.key === "ArrowLeft") nextIndex = Math.max(index - 1, 0);
                else if (event.key === "Home") nextIndex = 0;
                else if (event.key === "End") nextIndex = options.length - 1;
                else return;
                event.preventDefault();
                track.current
                  ?.querySelectorAll<HTMLButtonElement>("button")
                  [nextIndex]?.focus({ preventScroll: true });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {navigation.visible && (
        <OperationalIconButton
          className="attendance-type-carousel-arrow"
          label="Próximos tipos de conversa"
          aria-controls={viewportId}
          aria-disabled={!navigation.next}
          onClick={() => {
            if (navigation.next) move(1);
          }}
        >
          <UiIcon icon={ChevronRight} scale="row" />
        </OperationalIconButton>
      )}
    </div>
  );
}
