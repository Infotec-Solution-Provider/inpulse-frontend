type ReportType = "chats";
type ChatId = number;
type InternalChatId = number;
type WalletId = number;
type UserId = number;
type SectorId = number;
type InstanceName = string;
export type SocketClientChatRoom = `chat:${ChatId}`;
export type SocketClientAdminRoom = "admin";
export type SocketClientMonitorRoom = `monitor`;
export type SocketClientReportsRoom = `reports:${ReportType}`;
export type SocketClientWalletRoom = `wallet:${WalletId}`;
export type SocketClientUserRoom = `user:${UserId}`;
export type SocketClientInternalChatRoom = `internal-chat:${InternalChatId}`;
export type SocketClientRoom = SocketClientChatRoom | SocketClientAdminRoom | SocketClientReportsRoom | SocketClientMonitorRoom | SocketClientWalletRoom | SocketClientUserRoom | SocketClientInternalChatRoom;
type SocketRoomWithInstance<T extends string> = `${InstanceName}:${T}`;
type SocketRoomWithSector<T extends string> = SocketRoomWithInstance<`${SectorId}:${T}`>;
export type SocketServerAdminRoom = SocketRoomWithSector<SocketClientAdminRoom>;
export type SocketServerMonitorRoom = SocketRoomWithSector<SocketClientMonitorRoom>;
export type SocketServerReportsRoom = SocketRoomWithSector<SocketClientReportsRoom>;
export type SocketServerChatRoom = SocketRoomWithInstance<SocketClientChatRoom>;
export type SocketServerWalletRoom = SocketRoomWithInstance<SocketClientWalletRoom>;
export type SocketServerUserRoom = SocketRoomWithInstance<SocketClientUserRoom>;
export type SocketServerInternalChatRoom = SocketRoomWithInstance<SocketClientInternalChatRoom>;
export type SocketServerRoom = SocketServerChatRoom | SocketServerAdminRoom | SocketServerMonitorRoom | SocketServerReportsRoom | SocketServerWalletRoom | SocketServerUserRoom | SocketServerInternalChatRoom;
export interface JoinRoomFn {
    (room: SocketClientRoom): void;
}
export {};
