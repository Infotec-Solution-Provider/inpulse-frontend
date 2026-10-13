import { beforeEach, describe, expect, it, vi } from "vitest";

const socketMock = vi.hoisted(() => {
  const listeners = new Map<string, Set<(data: unknown) => void>>();
  return {
    listeners,
    socket: {
      auth: {},
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, callback: (data: unknown) => void) => {
        const callbacks = listeners.get(event) ?? new Set();
        callbacks.add(callback);
        listeners.set(event, callbacks);
      }),
      off: vi.fn((event: string, callback: (data: unknown) => void) => {
        listeners.get(event)?.delete(callback);
      }),
    },
  };
});

vi.mock("socket.io-client", () => ({ io: () => socketMock.socket }));

import SocketClient from "./socket.client";
import { SocketEventType } from "./types/socket-events.types";

describe("SocketClient subscriptions", () => {
  beforeEach(() => {
    socketMock.listeners.clear();
    socketMock.socket.connected = false;
    vi.clearAllMocks();
  });

  it("reconnects when the authenticated user token changes", () => {
    const client = new SocketClient("ws://test");

    client.connect("first-token");
    socketMock.socket.connected = true;
    client.connect("second-token");

    expect(socketMock.socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socketMock.socket.connect).toHaveBeenCalledTimes(2);
    expect(socketMock.socket.auth).toEqual({ token: "second-token" });
  });

  it("keeps multiple subscribers stable and removes only the requested listener", () => {
    const client = new SocketClient("ws://test");
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = client.subscribe(SocketEventType.WppMessageReaction, first);
    const unsubscribeSecond = client.subscribe(SocketEventType.WppMessageReaction, second);

    expect(socketMock.listeners.get(SocketEventType.WppMessageReaction)?.size).toBe(1);

    for (let index = 0; index < 100; index += 1) {
      for (const listener of socketMock.listeners.get(SocketEventType.WppMessageReaction) ?? []) {
        listener({ messageId: index });
      }
    }

    expect(first).toHaveBeenCalledTimes(100);
    expect(second).toHaveBeenCalledTimes(100);
    unsubscribeFirst();
    expect(socketMock.listeners.get(SocketEventType.WppMessageReaction)?.size).toBe(1);
    unsubscribeSecond();
    expect(socketMock.listeners.get(SocketEventType.WppMessageReaction)?.size).toBe(0);
  });
});
