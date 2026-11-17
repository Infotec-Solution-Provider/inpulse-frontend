"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";

export function useReportExecution<F, R>({
  scope,
  execute,
  validate,
}: {
  scope: string;
  execute: (filters: F, signal: AbortSignal) => Promise<R>;
  validate: (filters: F) => string | null;
}) {
  const [state, setState] = useState<{
    scope: string;
    result: R | null;
    applied: F | null;
    generatedAt: string | null;
    loading: boolean;
    error: string | null;
  }>({ scope, result: null, applied: null, generatedAt: null, loading: false, error: null });
  const pending = useRef<{ controller: AbortController; scope: string } | null>(null);
  const currentScope = useRef(scope);
  currentScope.current = scope;

  useEffect(
    () => () => {
      pending.current?.controller.abort();
      pending.current = null;
    },
    [scope],
  );

  const generate = useCallback(
    async (filters: F) => {
      if (currentScope.current !== scope || pending.current?.scope === scope) return;
      const error = validate(filters);
      if (error) {
        setState((previous) =>
          previous.scope === scope
            ? { ...previous, error }
            : { scope, result: null, applied: null, generatedAt: null, loading: false, error },
        );
        return;
      }
      const applied = structuredClone(filters);
      pending.current?.controller.abort();
      const request = { scope, controller: new AbortController() };
      pending.current = request;
      setState((previous) =>
        previous.scope === scope
          ? { ...previous, loading: true, error: null }
          : { scope, result: null, applied: null, generatedAt: null, loading: true, error: null },
      );
      try {
        const result = await execute(applied, request.controller.signal);
        if (pending.current !== request || currentScope.current !== scope) return;
        setState({
          scope,
          result,
          applied,
          generatedAt: new Date().toISOString(),
          loading: false,
          error: null,
        });
      } catch (cause) {
        if (
          request.controller.signal.aborted ||
          pending.current !== request ||
          currentScope.current !== scope
        )
          return;
        setState((previous) => ({
          ...previous,
          loading: false,
          error: sanitizeErrorMessage(cause),
        }));
      } finally {
        if (pending.current === request) pending.current = null;
      }
    },
    [execute, scope, validate],
  );

  const active = state.scope === scope;
  return {
    result: active ? state.result : null,
    applied: active ? state.applied : null,
    generatedAt: active ? state.generatedAt : null,
    loading: active && state.loading,
    error: active ? state.error : null,
    generate,
  };
}
