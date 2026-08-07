interface MessageWithIdentity {
  id: string | number;
  timestamp?: string | number;
}

function getTimestampValue(value: string | number): number {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue;

  const dateValue = Date.parse(String(value));
  return Number.isFinite(dateValue) ? dateValue : 0;
}

export function compareMessageChronology(
  first: MessageWithIdentity,
  second: MessageWithIdentity,
): number {
  if (first.timestamp != null && second.timestamp != null) {
    const timestampDifference =
      getTimestampValue(first.timestamp) - getTimestampValue(second.timestamp);
    if (timestampDifference !== 0) return timestampDifference;
  }

  return Number(first.id) - Number(second.id);
}

export default function mergeMessagesById<T extends MessageWithIdentity>(
  olderMessages: T[],
  newerMessages: T[],
  mergeExisting: (previous: T, next: T) => T = (_, next) => next,
): T[] {
  const merged = new Map<string | number, T>();

  for (const message of olderMessages) merged.set(message.id, message);
  for (const message of newerMessages) {
    const previous = merged.get(message.id);
    merged.set(message.id, previous ? mergeExisting(previous, message) : message);
  }

  const messages = [...merged.values()];
  if (!messages.every((message) => message.timestamp != null)) return messages;

  return messages.sort(compareMessageChronology);
}
