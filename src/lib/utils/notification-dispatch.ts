import { UserNotificationPreferences } from "@/lib/sdk-local";
import { toast } from "react-toastify";
import { safeNotification } from "./notifications";

interface NotificationDispatchInput {
  title: string;
  body: string;
  icon?: string;
}

export function dispatchConfiguredNotification(
  preferences: UserNotificationPreferences,
  event: keyof UserNotificationPreferences["events"],
  payload: NotificationDispatchInput,
): void {
  const config = preferences.events[event];

  if (config.channels.toast) {
    toast.info(`${payload.title}: ${payload.body}`);
  }

  if (config.channels.browser) {
    safeNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
    });
  }

  if (config.channels.sound.enabled && typeof window !== "undefined") {
    const audio = new Audio(config.channels.sound.file || "/notify-message.mp3");
    audio.volume = config.channels.sound.volume;
    audio.play().catch(() => {
      // Browsers can block autoplay unless user interaction has happened.
    });
  }
}
