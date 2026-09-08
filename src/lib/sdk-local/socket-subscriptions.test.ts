import { beforeEach, describe, expect, it, vi } from "vitest";
import SocketClient from "./socket.client";
import { SocketEventType } from "./types/socket-events.types";

const transport = vi.hoisted(() => {
  const listeners = new Map<string, Set<(data: unknown) => void>>();
  return {
    listeners,
    on: (event: string, callback: (data: unknown) => void) => {
      const subscribers = listeners.get(event) ?? new Set();
      subscribers.add(callback);
      listeners.set(event, subscribers);
    },
    off: (event: string, callback: (data: unknown) => void) =>
      listeners.get(event)?.delete(callback),
  };
});
vi.mock("socket.io-client", () => ({ io: () => transport }));
beforeEach(() => transport.listeners.clear());

describe("independent socket subscriptions", () => {
  it("keeps both message domains subscribed and removes only the owner callback", () => {
    const client = new SocketClient("http://localhost");
    const wpp = vi.fn();
    const internal = vi.fn();
    const removeWpp = client.subscribe(SocketEventType.WppMessageReaction, wpp);
    const removeInternal = client.subscribe(SocketEventType.WppMessageReaction, internal);
    transport.listeners
      .get(SocketEventType.WppMessageReaction)
      ?.forEach((callback) => callback({ messageId: 17 }));
    expect(wpp).toHaveBeenCalledTimes(1);
    expect(internal).toHaveBeenCalledTimes(1);
    removeWpp();
    removeWpp();
    transport.listeners
      .get(SocketEventType.WppMessageReaction)
      ?.forEach((callback) => callback({ messageId: 18 }));
    expect(wpp).toHaveBeenCalledTimes(1);
    expect(internal).toHaveBeenCalledTimes(2);
    removeInternal();
    expect(transport.listeners.get(SocketEventType.WppMessageReaction)?.size).toBe(0);
  });

  it("preserves legacy on replacement without detaching independent subscriptions", () => {
    const client = new SocketClient("http://localhost");
    const independent = vi.fn();
    const first = vi.fn();
    const second = vi.fn();
    client.subscribe(SocketEventType.WppMessageReaction, independent);
    client.on(SocketEventType.WppMessageReaction, first);
    client.on(SocketEventType.WppMessageReaction, second);
    client.off(SocketEventType.WppMessageReaction);
    transport.listeners
      .get(SocketEventType.WppMessageReaction)
      ?.forEach((callback) => callback({ messageId: 17 }));
    expect(independent).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });
});
