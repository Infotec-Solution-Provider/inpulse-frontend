import { useContext, useCallback, useEffect, useRef } from "react";
import { AuthContext } from "@/app/auth-context";
import type { MessageReactionSnapshot } from "@/lib/sdk-local";
import {
  assertReactionConfirmation,
  MessageReactionTarget,
  ReactionRequestCoordinator,
} from "@/lib/utils/message-reactions";

export function useConfirmedReaction(
  request: (
    target: MessageReactionTarget,
    emoji: string,
    signal: AbortSignal,
  ) => Promise<MessageReactionSnapshot>,
  apply: (snapshot: MessageReactionSnapshot) => void,
) {
  const { instance, user, token } = useContext(AuthContext);
  const scope = JSON.stringify([instance, user?.CODIGO, !!token]);
  const sessionRef = useRef({ scope, controller: new AbortController() });
  if (sessionRef.current.scope !== scope) {
    sessionRef.current.controller.abort();
    sessionRef.current = { scope, controller: new AbortController() };
  }
  const session = sessionRef.current;
  const coordinator = useRef(new ReactionRequestCoordinator());
  useEffect(() => {
    if (session.controller.signal.aborted) session.controller = new AbortController();
    const controller = session.controller;
    return () => controller.abort();
  }, [session]);

  return useCallback(
    (target: MessageReactionTarget, emoji: string) => {
      if (!instance || !user || !token)
        return Promise.reject(new Error("Sessão indisponível para reagir à mensagem."));
      const signal = session.controller.signal;
      return coordinator.current.run(session.scope, target, emoji, async () => {
        signal.throwIfAborted();
        const result = assertReactionConfirmation(await request(target, emoji, signal), target);
        signal.throwIfAborted();
        apply(result);
        return result;
      });
    },
    [instance, user, token, session, request, apply],
  );
}
