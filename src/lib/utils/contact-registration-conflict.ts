import type { ContactRegistrationConflict } from "@/lib/sdk-local";

export function getContactRegistrationConflict(error: unknown): ContactRegistrationConflict | null {
  const visited = new Set<unknown>();
  let current = error;

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const candidate = current as { response?: { data?: unknown }; cause?: unknown };
    const payload = candidate.response?.data as Partial<ContactRegistrationConflict> | undefined;

    if (
      payload?.code === "CONTACT_ALREADY_EXISTS" &&
      payload.existingContact &&
      typeof payload.existingContact.id === "number"
    ) {
      return payload as ContactRegistrationConflict;
    }

    current = candidate.cause;
  }

  return null;
}
