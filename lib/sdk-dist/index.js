"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadyMessageClient = exports.InternalChatClient = exports.WalletsClient = exports.WhatsappClient = exports.UsersClient = exports.SocketClient = exports.SocketServerClient = exports.ReportsClient = exports.InstancesClient = exports.FilesClient = exports.CustomersClient = exports.AuthClient = exports.AiClient = void 0;
__exportStar(require("./types"), exports);
var ai_client_1 = require("./ai.client");
Object.defineProperty(exports, "AiClient", { enumerable: true, get: function () { return __importDefault(ai_client_1).default; } });
var auth_client_1 = require("./auth.client");
Object.defineProperty(exports, "AuthClient", { enumerable: true, get: function () { return __importDefault(auth_client_1).default; } });
var customers_client_1 = require("./customers.client");
Object.defineProperty(exports, "CustomersClient", { enumerable: true, get: function () { return __importDefault(customers_client_1).default; } });
var files_client_1 = require("./files.client");
Object.defineProperty(exports, "FilesClient", { enumerable: true, get: function () { return __importDefault(files_client_1).default; } });
var instance_client_1 = require("./instance.client");
Object.defineProperty(exports, "InstancesClient", { enumerable: true, get: function () { return __importDefault(instance_client_1).default; } });
var reports_client_1 = require("./reports.client");
Object.defineProperty(exports, "ReportsClient", { enumerable: true, get: function () { return __importDefault(reports_client_1).default; } });
var socket_server_client_1 = require("./socket-server.client");
Object.defineProperty(exports, "SocketServerClient", { enumerable: true, get: function () { return __importDefault(socket_server_client_1).default; } });
var socket_client_1 = require("./socket.client");
Object.defineProperty(exports, "SocketClient", { enumerable: true, get: function () { return __importDefault(socket_client_1).default; } });
var users_client_1 = require("./users.client");
Object.defineProperty(exports, "UsersClient", { enumerable: true, get: function () { return __importDefault(users_client_1).default; } });
var whatsapp_client_1 = require("./whatsapp.client");
Object.defineProperty(exports, "WhatsappClient", { enumerable: true, get: function () { return __importDefault(whatsapp_client_1).default; } });
var wallets_client_1 = require("./wallets.client");
Object.defineProperty(exports, "WalletsClient", { enumerable: true, get: function () { return __importDefault(wallets_client_1).default; } });
var internal_client_1 = require("./internal.client");
Object.defineProperty(exports, "InternalChatClient", { enumerable: true, get: function () { return __importDefault(internal_client_1).default; } });
var ready_message_client_1 = require("./ready-message.client");
Object.defineProperty(exports, "ReadyMessageClient", { enumerable: true, get: function () { return __importDefault(ready_message_client_1).default; } });
