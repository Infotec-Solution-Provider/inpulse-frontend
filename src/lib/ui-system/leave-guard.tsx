"use client";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { PilotDesignProvider } from "./provider";
type Draft = { dirty: boolean; busy: boolean; review: boolean };
const Context = createContext<((id: symbol, draft: Draft | null) => void) | null>(null);

/** Menu navigation must not silently abandon edits or a mutation still being reconciled. */
export function CrmLeaveGuardProvider({
  scope,
  navigate,
  children,
}: {
  scope: string;
  navigate: (url: string) => void;
  children: ReactNode;
}) {
  const registry = useMemo(() => new Map<symbol, Draft>(), [scope]);
  const [, changed] = useState(0);
  const [target, setTarget] = useState<{ scope: string; url: string } | null>(null);
  const register = useMemo(
    () => (id: symbol, draft: Draft | null) => {
      if (draft && (draft.dirty || draft.busy || draft.review)) registry.set(id, draft);
      else if (!registry.delete(id)) return;
      changed((value) => value + 1);
    },
    [registry],
  );
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element) ||
        !registry.size
      )
        return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search) ||
        link.getAttribute("href")?.startsWith("#")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setTarget({ scope, url: url.pathname + url.search + url.hash });
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [registry, scope]);
  const blocked = [...registry.values()].some((draft) => draft.busy || draft.review);
  return (
    <Context.Provider value={register}>
      {children}
      {target?.scope === scope && (
        <PilotDesignProvider style={{ display: "contents" }}>
          <Dialog open onClose={() => setTarget(null)} aria-labelledby="crm-leave-title">
            <DialogTitle id="crm-leave-title">
              {blocked ? "Confira a gravação antes de sair" : "Descartar alterações?"}
            </DialogTitle>
            <DialogContent>
              {blocked
                ? "Aguarde a gravação ou confira seu resultado nesta tela antes de navegar."
                : "Há alterações não salvas. Ao sair desta tela, o rascunho será descartado."}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTarget(null)}>Continuar editando</Button>
              {!blocked && (
                <Button
                  color="error"
                  onClick={() => {
                    const url = target.url;
                    setTarget(null);
                    navigate(url);
                  }}
                >
                  Descartar e sair
                </Button>
              )}
            </DialogActions>
          </Dialog>
        </PilotDesignProvider>
      )}
    </Context.Provider>
  );
}
export function useCrmLeaveGuard(dirty: boolean, busy = false, review = false) {
  const register = useContext(Context),
    id = useRef(Symbol("crm-draft"));
  useLayoutEffect(() => {
    register?.(id.current, { dirty, busy, review });
    return () => register?.(id.current, null);
  }, [register, dirty, busy, review]);
}
