"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
/**
 * A client for interacting with a socket server API.
 * Extends the `ApiClient` class to provide http functionality
 * for emitting events to specific rooms on the server.
 */
class SocketServerApi extends api_client_1.default {
    /**
     * Creates an instance of the SocketServerApiClient.
     *
     * @param baseUrl - The base URL for the socket server API.
     */
    constructor(baseUrl) {
        super(baseUrl);
    }
    /**
     * Emits a socket event to a specified room with a given event name and value.
     *
     * @param event - The name of the event to emit.
     * @param room - The name of the room to which the event should be emitted.
     * @param value - The payload or data to send with the event.
     * @returns A promise that resolves with the response from the API call.
     */
    emit = (event, room, value) => {
        return this.ax
            .post(`/api/ws/emit/${room}/${event}`, value)
            .then((res) => res.data);
    };
}
exports.default = SocketServerApi;
