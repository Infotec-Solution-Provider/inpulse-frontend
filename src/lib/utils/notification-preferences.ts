import {
  NotificationEventKey,
  NotificationEventPreferences,
  User,
  UserNotificationPreferences,
} from "@/lib/sdk-local";

export const NOTIFICATION_SOUND_OPTIONS = [
  { value: "/notify-chat.mp3", label: "Chat" },
  { value: "/notify-message.mp3", label: "Mensagem" },
  { value: "/notify-mention.mp3", label: "Menção" },
] as const;

type NotificationSoundPath = (typeof NOTIFICATION_SOUND_OPTIONS)[number]["value"];

const DEFAULT_SOUND_FILE: NotificationSoundPath = "/notify-message.mp3";
const ALLOWED_SOUND_FILES = new Set<string>(NOTIFICATION_SOUND_OPTIONS.map((item) => item.value));

const baseEventConfig: NotificationEventPreferences = {
  enabled: true,
  suppressWhenChatFocused: true,
  channels: {
    toast: false,
    browser: true,
    sound: {
      enabled: true,
      file: DEFAULT_SOUND_FILE,
      volume: 0.5,
    },
  },
};

export const notificationEvents: Array<{ key: NotificationEventKey; label: string }> = [
  { key: "new_message", label: "Nova mensagem" },
  { key: "new_conversation", label: "Nova conversa" },
  { key: "mention", label: "Menção" },
];

function clampVolume(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
}

function normalizeEventConfig(
  raw: unknown,
  fallback: NotificationEventPreferences,
): NotificationEventPreferences {
  const data = (raw ?? {}) as Partial<NotificationEventPreferences>;
  const channels = (data.channels ?? {}) as Partial<NotificationEventPreferences["channels"]>;
  const sound = (channels.sound ?? {}) as Partial<NotificationEventPreferences["channels"]["sound"]>;

  return {
    enabled: typeof data.enabled === "boolean" ? data.enabled : fallback.enabled,
    suppressWhenChatFocused:
      typeof data.suppressWhenChatFocused === "boolean"
        ? data.suppressWhenChatFocused
        : fallback.suppressWhenChatFocused,
    channels: {
      toast: typeof channels.toast === "boolean" ? channels.toast : fallback.channels.toast,
      browser: typeof channels.browser === "boolean" ? channels.browser : fallback.channels.browser,
      sound: {
        enabled:
          typeof sound.enabled === "boolean" ? sound.enabled : fallback.channels.sound.enabled,
        file:
          typeof sound.file === "string" && ALLOWED_SOUND_FILES.has(sound.file.trim())
            ? sound.file.trim()
            : fallback.channels.sound.file,
        volume: clampVolume(sound.volume, fallback.channels.sound.volume),
      },
    },
  };
}

type LegacyNotificationEvents = Partial<
  Record<
    | "external_new_message"
    | "internal_new_message"
    | "external_new_conversation"
    | "internal_new_conversation",
    NotificationEventPreferences
  >
>;

function pickFirstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

export function createDefaultNotificationPreferences(): UserNotificationPreferences {
  return {
    version: 1,
    events: {
      new_message: normalizeEventConfig(baseEventConfig, baseEventConfig),
      new_conversation: normalizeEventConfig(
        {
          ...baseEventConfig,
          suppressWhenChatFocused: false,
          channels: {
            ...baseEventConfig.channels,
            sound: {
              ...baseEventConfig.channels.sound,
              enabled: false,
              file: "/notify-chat.mp3",
            },
          },
        },
        baseEventConfig,
      ),
      mention: normalizeEventConfig(
        {
          ...baseEventConfig,
          suppressWhenChatFocused: false,
          channels: {
            ...baseEventConfig.channels,
            sound: {
              ...baseEventConfig.channels.sound,
              enabled: true,
              file: "/notify-mention.mp3",
            },
          },
        },
        baseEventConfig,
      ),
    },
  };
}

export function normalizeNotificationPreferences(
  raw: unknown,
): UserNotificationPreferences {
  const defaults = createDefaultNotificationPreferences();
  const payload = (raw ?? {}) as Partial<UserNotificationPreferences>;
  const events = (payload.events ?? {}) as Partial<UserNotificationPreferences["events"]>;
  const legacyEvents = (payload.events ?? {}) as LegacyNotificationEvents;

  const mergedNewMessage = pickFirstDefined(
    events.new_message,
    legacyEvents.internal_new_message,
    legacyEvents.external_new_message,
  );

  const mergedNewConversation = pickFirstDefined(
    events.new_conversation,
    legacyEvents.internal_new_conversation,
    legacyEvents.external_new_conversation,
  );

  const mergedMention = pickFirstDefined(
    events.mention,
    legacyEvents.internal_new_message,
  );

  return {
    version: typeof payload.version === "number" ? payload.version : defaults.version,
    events: {
      new_message: normalizeEventConfig(mergedNewMessage, defaults.events.new_message),
      new_conversation: normalizeEventConfig(
        mergedNewConversation,
        defaults.events.new_conversation,
      ),
      mention: normalizeEventConfig(mergedMention, defaults.events.mention),
    },
  };
}

interface NotificationPolicyInput {
  event: NotificationEventKey;
  isChatFocused?: boolean;
}

export function shouldDispatchNotification(
  preferences: UserNotificationPreferences,
  input: NotificationPolicyInput,
): boolean {
  const eventConfig = preferences.events[input.event];

  if (!eventConfig.enabled) {
    return false;
  }

  if (eventConfig.suppressWhenChatFocused && input.isChatFocused) {
    return false;
  }

  return true;
}

export function isInternalMentionForUser(text: string, user: User | null): boolean {
  if (!text || !user) {
    return false;
  }

  const mentionPattern = /@(~?(?:\+?\d[\d\s().-]*\d))/g;
  const mentions = [...text.matchAll(mentionPattern)].map((match) => match[1]?.trim() ?? "");

  if (mentions.length === 0) {
    return false;
  }

  const userCode = String(user.CODIGO);
  const userPhone = (user.WHATSAPP ?? "").replace(/\D/g, "");

  return mentions.some((rawMention) => {
    const mentionNoTilde = rawMention.replace(/^~/, "");
    const mentionDigits = mentionNoTilde.replace(/\D/g, "");

    if (mentionNoTilde === userCode) {
      return true;
    }

    return !!userPhone && mentionDigits.length > 0 && mentionDigits === userPhone;
  });
}
