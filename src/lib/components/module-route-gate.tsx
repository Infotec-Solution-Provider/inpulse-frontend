"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { canAccessFeaturePath, featureRoute } from "@/lib/module-feature-access";
import { canAccessPrivatePathForRole } from "@/lib/permissions/operator-access";

export default function RouteFeatureGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, instance } = useAuthContext();
  const { loaded, parameters } = useWhatsappContext();
  const routeConfig = featureRoute(pathname, instance);

  const hasRoleAccess =
    routeConfig?.segment === "/channels" || canAccessPrivatePathForRole(pathname, user?.NIVEL);

  if (!hasRoleAccess) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Perfil sem acesso a esta funcionalidade.
      </div>
    );
  }

  if (!routeConfig) {
    return <>{children}</>;
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-300">
        Carregando permissões...
      </div>
    );
  }

  const isAllowed = canAccessFeaturePath(parameters, pathname, instance);

  if (!isAllowed) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Funcionalidade indisponível para esta instância.
      </div>
    );
  }

  return <>{children}</>;
}
