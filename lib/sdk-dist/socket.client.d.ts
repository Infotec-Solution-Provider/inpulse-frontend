import { ListenSocketEventFn, UnlistenSocketEventFn } from "./types/socket-events.types";
import { JoinRoomFn } from "./types";
/**
 * A client for interacting with a WebSocket server.
 * This class provides methods to connect to the server, listen for events,
 * and manage WebSocket connections.
 */
export default class SocketClient {
    private readonly ws;
    private readonly listeners;
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
    constructor(baseUrl: string);
    /**
     * Establishes a WebSocket connection using the provided authentication token.
     *
     * @param token - The authentication token to be used for the WebSocket connection.
     *                This token is sent as part of the WebSocket authentication payload.
     */
    connect(token: string): void;
    /**
     * Disconnects the WebSocket client from the server.
     * This method terminates the current WebSocket connection
     * by invoking the `disconnect` method on the WebSocket instance.
     */
    disconnect(): void;
    /**
     * Registers an event listener for a specified WebSocket event and provides a way to remove it.
     *
     * @param event - The name of the WebSocket event to listen for.
     * @param callback - A function to be executed when the event is triggered. The function receives the event data as its argument.
     * @returns A function that, when called, removes the event listener for the specified event.
     */
    on: ListenSocketEventFn;
    /**
     * Removes a previously registered event listener from the WebSocket connection.
     *
     * @param event - The name of the event to stop listening for.
     * @param callback - The callback function that was previously registered for the event.
     */
    off: UnlistenSocketEventFn;
    joinRoom: JoinRoomFn;
    leaveRoom: JoinRoomFn;
}
