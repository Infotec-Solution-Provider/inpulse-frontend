import { UserRole } from "@/lib/sdk-local";

export function isExternalOperator(role: UserRole | null | undefined | string): boolean {
  return role === UserRole.EXTERNAL;
}

export function canAccessInternalChats(
  parameters: Record<string, string>,
  role: UserRole | null | undefined | string,
): boolean {
  if (parameters["disable_internal_chats"] === "true") {
    return false;
  }

  return role != null;
}

export function canAccessInternalGroups(
  parameters: Record<string, string>,
  role: UserRole | null | undefined | string,
): boolean {
  if (isExternalOperator(role)) {
    return false;
  }

  return parameters["disable_internal_groups"] !== "true";
}

export function canAccessPrivatePathForRole(
  pathname: string,
  role: UserRole | null | undefined | string,
): boolean {
  if (!isExternalOperator(role)) {
    return true;
  }

  const cleanPath = pathname.split("?")[0];
  const segments = cleanPath.split("/").filter(Boolean);

  // For EXTERNO, only the instance root page is allowed in private routes.
  return segments.length <= 1;
}
