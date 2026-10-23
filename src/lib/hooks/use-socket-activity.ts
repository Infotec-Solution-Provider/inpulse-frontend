import { useEffect, useState } from "react";
import type { SocketClient } from "../sdk-local";

export type WebSocketStatus = "connected" | "connecting" | "disconnected";

export default function useSocketActivity(socket: SocketClient, scope: string, enabled: boolean) {
  const [connectionStatus, setConnectionStatus] = useState<WebSocketStatus>("disconnected");
  const [lastWebSocketAt, setLastWebSocketAt] = useState<number | null>(null);
  useEffect(() => {
    setLastWebSocketAt(null);
    if (!enabled) { setConnectionStatus("disconnected"); return; }
    const removeState = socket.subscribeConnectionState(setConnectionStatus);
    const removeActivity = socket.subscribeActivity((event) => {
      if (/^(wpp_|internal_(message|chat))/.test(event)) setLastWebSocketAt(Date.now());
    });
    return () => { removeState(); removeActivity(); };
  }, [socket, scope, enabled]);
  return { connectionStatus, lastWebSocketAt };
}
