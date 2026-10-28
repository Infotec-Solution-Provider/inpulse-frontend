/** Absolute document links cross applications; Next Link would retain this app's basePath. */
export function frontendVersionHref(instance: string, version: "legacy" | "new"): string {
  const tenant = encodeURIComponent(instance);
  return `${version === "new" ? "/nova" : ""}/${tenant}`;
}

export const frontendBasePath = process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH || "";

export function frontendAssetPath(path: string): string {
  return `${frontendBasePath}${path}`;
}

export function frontendNavigationPath(path: string): string {
  return frontendBasePath && path.startsWith(`${frontendBasePath}/`) ? path.slice(frontendBasePath.length) : path;
}
