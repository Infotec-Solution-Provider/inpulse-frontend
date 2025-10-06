// getFullName, getFirstName, getLastName

export function getFullName(name: string | null | undefined): string {
  if (!name) return "Usuário sem nome";
  return name.trim().replace(/\s+/g, " ");
}

export function getFirstName(name: string | null | undefined): string {
  if (!name) return "Usuário";
  return getFullName(name).split(" ")[0];
}

/**
 * Extracts and returns the last name(s) from a given full name string.
 * If the input is null, undefined, or does not contain a last name, returns an empty string.
 *
 * @param name - The full name as a string, or null/undefined.
 * @returns The last name(s) as a string, or an empty string if not available.
 */
export function getLastName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = getFullName(name).split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}
