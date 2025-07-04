export function safeNotification(title: string, options?: NotificationOptions) {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, options);
  }
}
