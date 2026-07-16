import usersService, { PushSubscriptionPayload } from "@/lib/services/users.service";

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalizedValue.length % 4)) % 4);
  const decodedValue = window.atob(normalizedValue + padding);
  const output = new Uint8Array(decodedValue.length);

  for (let index = 0; index < decodedValue.length; index += 1) {
    output[index] = decodedValue.charCodeAt(index);
  }

  return output;
}

function toPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const subscriptionJson = subscription.toJSON();
  const auth = subscriptionJson.keys?.auth;
  const p256dh = subscriptionJson.keys?.p256dh;

  if (!auth || !p256dh) {
    throw new Error("Assinatura de notificações inválida.");
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: { auth, p256dh },
  };
}

export async function subscribeToPushNotifications(userId: number, token: string): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("Este navegador não oferece suporte a notificações do PWA.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificações não concedida.");
  }

  usersService.setAuth(token);
  const publicKey = await usersService.getPushVapidPublicKey();
  if (!publicKey) {
    throw new Error("As notificações do PWA ainda não foram configuradas no servidor.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await usersService.upsertPushSubscription(userId, toPayload(subscription));
}