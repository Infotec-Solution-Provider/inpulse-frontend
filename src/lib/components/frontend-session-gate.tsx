"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { frontendBasePath, frontendVersionHref } from "@/lib/frontend-versions";
import {
  activateFrontendScope, frontendChoiceFromHash, getFrontendChoiceStorage,
  parseFrontendChoice, resolveFrontendVersion, type FrontendVersion,
} from "@/lib/frontend-selection";

const FrontendSelectionContext = createContext({ canSwitch: false });
export function useFrontendSelection() { return useContext(FrontendSelectionContext); }

export default function FrontendSessionGate({ children }: { children: ReactNode }) {
  const { instance, user, status } = useAuthContext();
  const { loaded, parameters } = useWhatsappContext();
  const currentVersion: FrontendVersion = frontendBasePath === "/nova" ? "new" : "legacy";
  const scope = user && instance ? `${encodeURIComponent(instance)}:${user.CODIGO}` : "";
  const switchEnabled = parameters.feature_frontend_switch_enabled === "true";
  const newAvailable = currentVersion === "new" || process.env.NEXT_PUBLIC_NEW_FRONTEND_ENABLED === "true";
  const [selection, setSelection] = useState<{ scope: string; version: FrontendVersion } | null>(null);
  const admittedScope = useRef("");

  useEffect(() => {
    if (!loaded || status !== "authenticated" || !user || !scope) return;
    const requested = frontendChoiceFromHash(window.location.hash);
    let saved: FrontendVersion | null = null;
    const storage = getFrontendChoiceStorage();
    try {
      if (storage) {
        const key = activateFrontendScope(storage, instance, user.CODIGO);
        if (!switchEnabled) storage.removeItem(key);
        else {
          if (requested) storage.setItem(key, requested);
          saved = parseFrontendChoice(storage.getItem(key));
        }
      }
    } catch { /* A blocked sessionStorage must not prevent the configured default. */ }
    if (window.location.hash.startsWith("#frontend-choice=")) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
    const version = resolveFrontendVersion(parameters, switchEnabled ? requested ?? saved : null);
    if (version === currentVersion) admittedScope.current = scope;
    setSelection({ scope, version });
    if (version !== currentVersion && (version !== "new" || newAvailable)) {
      // Full document navigation preserves registered beforeunload/call guards.
      const href = frontendVersionHref(instance, version);
      if (admittedScope.current === scope) {
        // The CRM leave guard captures document links, preserving dirty/reconciling
        // forms before a live configuration change can move an admitted session.
        const link = document.createElement("a");
        link.href = href;
        link.dataset.documentNavigation = "true";
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
      } else window.location.replace(href);
    }
  }, [currentVersion, instance, loaded, newAvailable, parameters.feature_new_frontend_enabled, scope, status, switchEnabled, user?.CODIGO]);

  const ready = loaded && status === "authenticated" && selection?.scope === scope;
  const selectedVersion = selection?.scope === scope ? selection.version : null;
  if (!ready || (selectedVersion !== currentVersion && admittedScope.current !== scope)) {
    return <div role="status" className="flex h-full items-center justify-center p-6 text-center text-sm">
      {ready && selectedVersion === "new" && !newAvailable
        ? "A nova interface ainda não está disponível neste ambiente. Contate o administrador."
        : "Carregando interface..."}
    </div>;
  }
  return <FrontendSelectionContext.Provider value={{ canSwitch: switchEnabled && newAvailable }}>
    {children}
  </FrontendSelectionContext.Provider>;
}
