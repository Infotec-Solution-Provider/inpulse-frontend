import { io, Socket } from "socket.io-client";
import {
	ListenSocketEventFn,
	SocketEventType,
	UnlistenSocketEventFn,
} from "./types/socket-events.types";
import { JoinRoomFn } from "./types";
import {
	completeFrontendInteractionAfterPaint,
	frontendPerformanceCollector,
	recordFrontendPerformanceMetric,
	startFrontendInteraction,
} from "@/lib/performance/frontend-performance";

const SOCKET_TELEMETRY_WINDOW_MS = 30_000;
const SOCKET_PAINT_COOLDOWN_MS = 100;
const SOCKET_PAINT_SAMPLE_RATE = 10;
const SOCKET_HANDLER_SAMPLE_RATE = 5;

interface SocketTelemetryAggregate {
	count: number;
	eventName: string;
	durationSampleCount: number;
	maximumHandlerDuration: number;
	route: string;
	sessionId: string;
}

/**
 * A client for interacting with a WebSocket server.
 * This class provides methods to connect to the server, listen for events,
 * and manage WebSocket connections.
 */
export default class SocketClient {
	private readonly ws: Socket;
	private readonly listeners: Map<SocketEventType, any> = new Map();
	private readonly telemetryAggregates = new Map<string, SocketTelemetryAggregate>();
	private readonly paintCooldowns = new Map<string, ReturnType<typeof setTimeout>>();
	private telemetryFlushTimer: ReturnType<typeof setTimeout> | null = null;
	private unregisterTelemetryFlushHook: (() => void) | null = null;

	/**
	 * Initializes a new instance of the socket client.
	 *
	 * @param baseUrl - The base URL of the WebSocket server to connect to.
	 *                  This URL is used to establish the WebSocket connection.
	 *
	 * The WebSocket client is configured with the following options:
	 * - `autoConnect`: Disabled by default to allow manual connection control.
	 * - `transports`: Uses the 'websocket' transport protocol exclusively.
	 */
	constructor(baseUrl: string) {
		this.ws = io(baseUrl, {
			autoConnect: false,
			transports: ["websocket"],
		});
	}

	/**
	 * Establishes a WebSocket connection using the provided authentication token.
	 *
	 * @param token - The authentication token to be used for the WebSocket connection.
	 *                This token is sent as part of the WebSocket authentication payload.
	 */
	public connect(token: string) {
		this.unregisterTelemetryFlushHook ??=
			frontendPerformanceCollector.registerFlushHook(() => this.flushSocketTelemetry());
		this.ws.auth = { token };
		if (!this.ws.connected) this.ws.connect();
	}

	/**
	 * Disconnects the WebSocket client from the server.
	 * This method terminates the current WebSocket connection
	 * by invoking the `disconnect` method on the WebSocket instance.
	 */
	public disconnect() {
		this.flushSocketTelemetry();
		this.unregisterTelemetryFlushHook?.();
		this.unregisterTelemetryFlushHook = null;
		this.ws.disconnect();
	}

	private beginSocketPaintInteraction(eventName: string, sessionId: string, sequence: number) {
		if (sequence % SOCKET_PAINT_SAMPLE_RATE !== 1) return null;
		const key = `${sessionId}\u0000${eventName}`;
		if (this.paintCooldowns.has(key)) return null;
		const token = startFrontendInteraction("socket_event_ready", {
			event: eventName,
			source: "sampled_1_in_10",
		});
		const timeout = setTimeout(() => {
			this.paintCooldowns.delete(key);
		}, SOCKET_PAINT_COOLDOWN_MS);
		this.paintCooldowns.set(key, timeout);
		return token;
	}

	private aggregateSocketTelemetry(
		eventName: string,
		handlerDuration: number | null,
		sessionId: string,
		route: string,
	) {
		const current = this.telemetryAggregates.get(eventName);
		if (current && (current.sessionId !== sessionId || current.route !== route)) {
			this.flushSocketTelemetry();
		}
		const aggregate = this.telemetryAggregates.get(eventName) ?? {
			count: 0,
			eventName,
			durationSampleCount: 0,
			maximumHandlerDuration: 0,
			route,
			sessionId,
		};
		aggregate.count += 1;
		if (handlerDuration !== null) {
			aggregate.durationSampleCount += 1;
			aggregate.maximumHandlerDuration = Math.max(
				aggregate.maximumHandlerDuration,
				handlerDuration,
			);
		}
		this.telemetryAggregates.set(eventName, aggregate);
		this.telemetryFlushTimer ??= setTimeout(
			() => this.flushSocketTelemetry(),
			SOCKET_TELEMETRY_WINDOW_MS,
		);
	}

	private flushSocketTelemetry() {
		if (this.telemetryFlushTimer !== null) clearTimeout(this.telemetryFlushTimer);
		this.telemetryFlushTimer = null;
		const activeSessionId = frontendPerformanceCollector.getSessionId();
		for (const aggregate of this.telemetryAggregates.values()) {
			if (!activeSessionId || aggregate.sessionId !== activeSessionId) continue;
			recordFrontendPerformanceMetric({
				name: "socket.event_count",
				value: aggregate.count,
				unit: "count",
				route: aggregate.route,
				tags: { event: aggregate.eventName, source: "30s_window" },
				detailed: true,
			});
			if (aggregate.durationSampleCount > 0) {
				recordFrontendPerformanceMetric({
					name: "socket.handler_duration",
					value: aggregate.maximumHandlerDuration,
					unit: "ms",
					route: aggregate.route,
					tags: { event: aggregate.eventName, source: "sampled_1_in_5_window_max" },
					detailed: true,
				});
			}
		}
		this.telemetryAggregates.clear();
	}

	/**
	 * Registers an event listener for a specified WebSocket event and provides a way to remove it.
	 *
	 * @param event - The name of the WebSocket event to listen for.
	 * @param callback - A function to be executed when the event is triggered. The function receives the event data as its argument.
	 * @returns A function that, when called, removes the event listener for the specified event.
	 */
	public on: ListenSocketEventFn = (event, callback) => {
		const oldListener = this.listeners.get(event);
		if (oldListener) {
			this.ws.off(event, oldListener);
		}

		const eventName = String(event).slice(0, 96);
		let eventSequence = 0;
		const measuredCallback = (data: unknown) => {
			if (!frontendPerformanceCollector.isDetailed()) return callback(data as never);
			const sessionId = frontendPerformanceCollector.getSessionId();
			if (!sessionId) return callback(data as never);
			eventSequence += 1;
			const shouldMeasureHandler = eventSequence % SOCKET_HANDLER_SAMPLE_RATE === 1;
			const startedAt = shouldMeasureHandler ? performance.now() : null;
			const route = frontendPerformanceCollector.getRoute();
			const paintInteraction = this.beginSocketPaintInteraction(eventName, sessionId, eventSequence);
			try {
				return callback(data as never);
			} finally {
				this.aggregateSocketTelemetry(
					eventName,
					startedAt === null ? null : performance.now() - startedAt,
					sessionId,
					route,
				);
				if (paintInteraction) completeFrontendInteractionAfterPaint(paintInteraction);
			}
		};

		this.ws.on(event, measuredCallback);
		this.listeners.set(event, measuredCallback);
	};

	/**
	 * Removes a previously registered event listener from the WebSocket connection.
	 *
	 * @param event - The name of the event to stop listening for.
	 * @param callback - The callback function that was previously registered for the event.
	 */
	public off: UnlistenSocketEventFn = (event) => {
		const listener = this.listeners.get(event);
		if (!listener) return;
		this.ws.off(event, listener);
	};

	public joinRoom: JoinRoomFn = (room) => {
		this.ws.emit("join-room", room);
	};

	public leaveRoom: JoinRoomFn = (room) => {
		this.ws.emit("leave-room", room);
	};
}
