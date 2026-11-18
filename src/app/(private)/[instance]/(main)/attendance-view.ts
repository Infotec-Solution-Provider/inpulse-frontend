"use client";

import { useCallback, useEffect, useState } from "react";

export type AttendanceView = "classic" | "integrated";

export function useAttendanceView(instance: string, userId: number | undefined) {
  const key =
    instance && userId != null
      ? `inpulse:attendance-view:v1:${encodeURIComponent(instance)}:${userId}`
      : null;
  const [choice, setChoice] = useState<{ key: string; view: AttendanceView } | null>(null);

  useEffect(() => {
    if (!key) return;
    function read() {
      if (!key) return;
      try {
        setChoice({
          key,
          view: localStorage.getItem(key) === "integrated" ? "integrated" : "classic",
        });
      } catch {
        setChoice({ key, view: "classic" });
      }
    }
    read();
    function sync(event: StorageEvent) {
      if (event.key === key || event.key === null) read();
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  const selectView = useCallback(
    (view: AttendanceView) => {
      if (!key) return;
      setChoice({ key, view });
      try {
        localStorage.setItem(key, view);
      } catch {
        // Switching still works when the browser blocks persistent storage.
      }
    },
    [key],
  );

  return [choice && choice.key === key ? choice.view : "classic", selectView] as const;
}
