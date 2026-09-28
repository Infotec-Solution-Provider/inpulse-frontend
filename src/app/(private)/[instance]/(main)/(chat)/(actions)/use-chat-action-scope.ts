import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "@/app/auth-context";
import { AppContext } from "../../../app-context";

/** An open action belongs to the operator/tenant that selected the conversation. */
export default function useChatActionScope() {
  const { instance, user, token } = useContext(AuthContext);
  const { closeModal } = useContext(AppContext);
  const currentScope = JSON.stringify([instance, user?.CODIGO]);
  const [initialScope] = useState(currentScope);
  const valid = Boolean(token) && initialScope === currentScope;
  const active = useRef(valid);
  const close = useRef(closeModal);
  active.current = valid;
  close.current = closeModal;
  useEffect(() => {
    active.current = valid;
    if (!valid) close.current();
    return () => {
      active.current = false;
    };
  }, [valid]);
  return { valid, isActive: () => active.current };
}
