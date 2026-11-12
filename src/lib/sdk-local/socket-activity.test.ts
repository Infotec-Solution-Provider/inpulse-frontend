import { beforeEach, describe, expect, it, vi } from "vitest";
import SocketClient from "./socket.client";
const transport = vi.hoisted(() => {
  const callbacks = new Map<string, Set<() => void>>();
  const any = new Set<(event: string) => void>();
  const ioCallbacks = new Map<string, Set<() => void>>();
  const add = (map: typeof callbacks, event: string, fn: () => void) => { if (!map.has(event)) map.set(event, new Set()); map.get(event)!.add(fn); };
  return { callbacks, any, ioCallbacks, connected: false, active: false,
    on(event: string, fn: () => void) { add(callbacks, event, fn); },
    off(event: string, fn: () => void) { callbacks.get(event)?.delete(fn); },
    onAny(fn: (event: string) => void) { any.add(fn); },
    offAny(fn: (event: string) => void) { any.delete(fn); },
    io: { on(event: string, fn: () => void) { add(ioCallbacks, event, fn); }, off(event: string, fn: () => void) { ioCallbacks.get(event)?.delete(fn); } },
  };
});
vi.mock("socket.io-client", () => ({ io: () => transport }));
beforeEach(() => { transport.callbacks.clear(); transport.ioCallbacks.clear(); transport.any.clear(); transport.connected = false; transport.active = false; });
describe("socket connection and activity", () => {
  it("distinguishes connected, reconnecting and disconnected and cleans up only its own observers", () => {
    const client = new SocketClient("http://localhost");
    const state = vi.fn();
    const stop = client.subscribeConnectionState(state);
    expect(state).toHaveBeenLastCalledWith("disconnected");
    transport.active = true;
    transport.ioCallbacks.get("reconnect_attempt")?.forEach((fn) => fn());
    expect(state).toHaveBeenLastCalledWith("connecting");
    transport.connected = true;
    transport.callbacks.get("connect")?.forEach((fn) => fn());
    expect(state).toHaveBeenLastCalledWith("connected");
    const activity = vi.fn();
    const stopActivity = client.subscribeActivity(activity);
    transport.any.forEach((fn) => fn("wpp_message"));
    expect(activity).toHaveBeenCalledWith("wpp_message");
    stop(); stopActivity();
    expect(transport.any.size).toBe(0);
    expect(transport.callbacks.get("connect")?.size).toBe(0);
    expect(transport.ioCallbacks.get("reconnect_attempt")?.size).toBe(0);
  });
});
