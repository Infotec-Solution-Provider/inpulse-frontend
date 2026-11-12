"use client";

import { useAuthContext } from "@/app/auth-context";
import { frontendBasePath } from "@/lib/frontend-versions";
import { frontendSwitchHref } from "@/lib/frontend-selection";
import { useFrontendSelection } from "./frontend-session-gate";

export default function FrontendVersionSwitch() {
  const { instance, user, status } = useAuthContext();
  const { canSwitch } = useFrontendSelection();
  const isNew = frontendBasePath === "/nova";
  if (!instance || !user || status !== "authenticated" || !canSwitch) return null;

  return (
    <div className="flex shrink-0 justify-end bg-slate-200 px-4 py-1 dark:bg-slate-800">
      <a
        href={frontendSwitchHref(instance, isNew ? "legacy" : "new")}
        data-document-navigation="true"
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-indigo-500 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-200 dark:hover:bg-indigo-950"
      >
        {isNew ? "Voltar à versão anterior" : "Experimentar nova versão"}
      </a>
    </div>
  );
}
