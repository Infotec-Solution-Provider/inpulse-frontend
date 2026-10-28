"use client";

import { useAuthContext } from "@/app/auth-context";
import { frontendBasePath, frontendVersionHref } from "@/lib/frontend-versions";

export default function FrontendVersionSwitch() {
  const { instance } = useAuthContext();
  const isNew = frontendBasePath === "/nova";
  if (!instance || (!isNew && process.env.NEXT_PUBLIC_NEW_FRONTEND_ENABLED !== "true")) return null;

  return (
    <a
      href={frontendVersionHref(instance, isNew ? "legacy" : "new")}
      data-document-navigation="true"
      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-indigo-500 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-200 dark:hover:bg-indigo-950"
    >
      {isNew ? "Voltar à versão anterior" : "Experimentar nova versão"}
    </a>
  );
}
