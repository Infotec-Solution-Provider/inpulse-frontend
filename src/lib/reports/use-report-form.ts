"use client";

import { useCallback, useState, type SetStateAction } from "react";
import { useReportExecution } from "./use-report-execution";

export function useReportForm<F, R>({
  scope,
  defaults,
  execute,
  validate,
  equal = sameFilters,
}: {
  scope: string;
  defaults: () => F;
  execute: (filters: F, signal: AbortSignal) => Promise<R>;
  validate: (filters: F) => string | null;
  equal?: (left: F, right: F) => boolean;
}) {
  const [state, setState] = useState(() => ({ scope, draft: defaults() }));
  const draft = state.scope === scope ? state.draft : defaults();
  const setDraft = useCallback(
    (action: SetStateAction<F>) => {
      setState((previous) => {
        const current = previous.scope === scope ? previous.draft : defaults();
        return {
          scope,
          draft: typeof action === "function" ? (action as (current: F) => F)(current) : action,
        };
      });
    },
    [scope, defaults],
  );
  const execution = useReportExecution({ scope, execute, validate });
  const { applied, generate, error, loading } = execution;
  const dirty = applied !== null && !equal(draft, applied);
  return {
    ...execution,
    draft,
    setDraft,
    dirty,
    locked: applied === null || dirty || loading || Boolean(error),
    submit: () => generate(draft),
    clear: () => setDraft(defaults()),
    restore: applied === null ? undefined : () => setDraft(applied),
    refresh: useCallback(
      () => (applied === null ? Promise.resolve() : generate(applied)),
      [applied, generate],
    ),
  };
}

function sameFilters<F>(left: F, right: F) {
  return JSON.stringify(left) === JSON.stringify(right);
}
