export default function isHybridCacheEnabled() {
  return process.env.NEXT_PUBLIC_HYBRID_CACHE_ENABLED !== "false";
}
