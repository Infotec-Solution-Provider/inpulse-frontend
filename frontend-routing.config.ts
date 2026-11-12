export function frontendRouting(environment: Record<string, string | undefined>) {
  const basePath = environment.FRONTEND_BASE_PATH || "";
  if (basePath !== "" && basePath !== "/nova") throw new Error("FRONTEND_BASE_PATH must be empty or /nova");
  const origin = environment.NEW_FRONTEND_ORIGIN || "";
  if (origin && (basePath || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(origin) || Number(new URL(origin).port) > 65535)) {
    throw new Error("NEW_FRONTEND_ORIGIN requires the legacy app and an explicit loopback HTTP port");
  }
  return {
    basePath,
    env: {
      NEXT_PUBLIC_FRONTEND_BASE_PATH: basePath,
      NEXT_PUBLIC_NEW_FRONTEND_ENABLED: origin ? "true" : "false",
    },
    versionRewrites: origin ? [{ source: "/nova/:path*", destination: `${origin}/nova/:path*` }] : [],
  };
}
