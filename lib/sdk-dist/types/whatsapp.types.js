"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WppChatPriority = exports.WppChatType = void 0;
var WppChatType;
(function (WppChatType) {
    WppChatType["RECEPTIVE"] = "RECEPTIVE";
    WppChatType["ACTIVE"] = "ACTIVE";
})(WppChatType || (exports.WppChatType = WppChatType = {}));
var WppChatPriority;
(function (WppChatPriority) {
    WppChatPriority["LOW"] = "LOW";
    WppChatPriority["NORMAL"] = "NORMAL";
    WppChatPriority["HIGH"] = "HIGH";
    WppChatPriority["VERY_HIGH"] = "VERY_HIGH";
    WppChatPriority["URGENCY"] = "URGENCY";
})(WppChatPriority || (exports.WppChatPriority = WppChatPriority = {}));
