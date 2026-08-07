export const SYSTEM_DEFAULT_CUSTOMER_ID = -1;

export function isSystemDefaultCustomer(customerId: number | null | undefined): boolean {
  return Number(customerId) === SYSTEM_DEFAULT_CUSTOMER_ID;
}
