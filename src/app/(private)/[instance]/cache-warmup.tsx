"use client";

import { AuthContext } from "@/app/auth-context";
import { hybridCache } from "@/lib/cache/hybrid-cache";
import isHybridCacheEnabled from "@/lib/cache/hybrid-cache-flag";
import {
  canAccessInternalGroups,
  canAccessPrivatePathForRole,
  isExternalOperator,
} from "@/lib/permissions/operator-access";
import { useRouter } from "next/navigation";
import { useContext, useEffect } from "react";
import { useWhatsappSession } from "./whatsapp-session-context";

const WARM_ROUTES = ["/", "/monitor", "/contacts", "/customers", "/internal-groups"] as const;

export default function CacheWarmup() {
  const { instance, user } = useContext(AuthContext);
  const { loaded, parameters } = useWhatsappSession();
  const router = useRouter();

  useEffect(() => {
    if (!isHybridCacheEnabled() || !instance || !user || !loaded) return;
    let cancelled = false;
    const routes = WARM_ROUTES.filter((route) => {
      if (!canAccessPrivatePathForRole(`${instance}${route}`, user.NIVEL)) return false;
      if (route === "/contacts") {
        return !isExternalOperator(user.NIVEL) && parameters["disable_contacts_crud"] !== "true";
      }
      if (route === "/customers") return !isExternalOperator(user.NIVEL);
      if (route === "/internal-groups") return canAccessInternalGroups(parameters, user.NIVEL);
      return true;
    });
    const run = async () => {
      if (cancelled) return;
      await hybridCache.pruneExpired();
      for (const route of routes) {
        if (cancelled) return;
        await router.prefetch(`/${instance}${route}`);
      }
    };

    const windowWithIdle = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const requestIdle = windowWithIdle.requestIdleCallback;
    const cancelIdle = windowWithIdle.cancelIdleCallback;
    const handle = requestIdle ? requestIdle(run, { timeout: 3000 }) : window.setTimeout(run, 1500);

    return () => {
      cancelled = true;
      if (cancelIdle && requestIdle) {
        cancelIdle(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, [instance, loaded, parameters, router, user]);

  return null;
}
