/** Optional session capabilities. The backend remains the authority for every operation. */
export interface TenantUiPolicy {
  revision: string;
  sharedUserIds: number[];
  canTransferAttendance: boolean;
  canUseAdminTransferTarget: boolean;
  excludedOperatorIds: number[];
  crmSectorId?: number;
  whatsappSectorId?: number;
  crmSectorByWhatsappSector?: Record<string, number>;
}

export function canTransferTo(policy: TenantUiPolicy | null | undefined, targetUserId: number): boolean {
  if (!policy) return true;
  if (!policy.canTransferAttendance || policy.excludedOperatorIds.includes(targetUserId)) return false;
  return targetUserId !== -1 || policy.canUseAdminTransferTarget;
}
