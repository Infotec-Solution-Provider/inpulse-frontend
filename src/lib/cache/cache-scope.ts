export function createCacheScope(instance: string, userId: number) {
  return `v1:${instance}:${userId}`;
}
