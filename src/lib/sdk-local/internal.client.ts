import ApiClient from "./api-client";
import { DataResponse } from "./types/response.types";
import {
	InternalChat,
	InternalChatMember,
	InternalGroup,
	InternalMessage,
	PaginatedInternalMessages,
	InternalWhatsappSenderName,
	PaginatedInternalWhatsappSenderMessages,
	PaginatedInternalWhatsappSenders,
	InternalSendMessageData,
} from "./types/internal.types";
import FormData from "form-data";

type GetChatsResponse = DataResponse<{
	chats: (InternalChat & { participants: InternalChatMember[] })[];
	messages: InternalMessage[];
}>;

type InternalChatsPayload = {
	chats: (InternalChat & { participants: InternalChatMember[] })[];
	messages: InternalMessage[];
};

export default class InternalChatClient extends ApiClient {
	private normalizeChatsPayload(
		response:
			| GetChatsResponse
			| InternalChatsPayload
			| null
			| undefined,
	): InternalChatsPayload {
		const payload = Array.isArray((response as GetChatsResponse | undefined)?.data?.chats)
			|| Array.isArray((response as GetChatsResponse | undefined)?.data?.messages)
			? (response as GetChatsResponse).data
			: (response as InternalChatsPayload | null | undefined);

		return {
			chats: Array.isArray(payload?.chats) ? payload.chats : [],
			messages: Array.isArray(payload?.messages) ? payload.messages : [],
		};
	}

	public async createInternalChat(
		participants: number[],
		isGroup: boolean = false,
		groupName: string | null = null,
		groupId: string | null = null,
		groupImage: File | null = null,
	) {
		const form = new FormData();

		if (groupImage) {
			form.append("file", groupImage);
		}

		form.append(
			"data",
			JSON.stringify({ participants, isGroup, groupName, groupId }),
		);

		const { data: res } = await this.ax.post<
			DataResponse<InternalChat>
		>(`/api/internal/chats`, form, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
			timeout: groupImage
				? ApiClient.UPLOAD_TIMEOUT_MS
				: ApiClient.DEFAULT_TIMEOUT_MS,
		});

		return res.data;
	}

	public async deleteInternalChat(chatId: number) {
		const url = `/api/internal/chats/${chatId}`;
		await this.ax.delete<DataResponse<InternalChat>>(url);
	}

	public async getInternalChatsBySession(token: string | null = null, messages = true) {
		const url = `/api/internal/session/chats?messages=${messages}`;

		const headers = token
			? { Authorization: `Bearer ${token}` }
			: undefined;

		const { data: response } = await this.ax.get<GetChatsResponse | InternalChatsPayload>(url, {
			headers,
		});

		return this.normalizeChatsPayload(response);
	}

	public async getChatMessagesPage(id: number, limit = 50, beforeId?: number | null) {
		const params = new URLSearchParams({ limit: String(limit) });
		if (beforeId) params.set("beforeId", String(beforeId));
		const { data: res } = await this.ax.get<DataResponse<PaginatedInternalMessages>>(
			`/api/internal/chats/${id}/messages?${params.toString()}`,
		);
		return res.data;
	}

	public async getInternalGroups() {
		const url = `/api/internal/groups`;
		const { data: response } =
			await this.ax.get<DataResponse<InternalGroup[]> | InternalGroup[]>(url);

		if (Array.isArray(response)) {
			return response;
		}

		return Array.isArray(response?.data) ? response.data : [];
	}

	public async getUnidentifiedWhatsappSenders(input: {
		page?: number;
		perPage?: number;
		search?: string;
	}) {
		const params = new URLSearchParams();
		if (input.page) params.set("page", String(input.page));
		if (input.perPage) params.set("perPage", String(input.perPage));
		if (input.search) params.set("search", input.search);
		const { data: res } = await this.ax.get<DataResponse<PaginatedInternalWhatsappSenders>>(
			`/api/internal/whatsapp-senders?${params.toString()}`,
		);
		return res.data;
	}

	public async getWhatsappSenderNames() {
		const { data: res } = await this.ax.get<DataResponse<InternalWhatsappSenderName[]>>(
			"/api/internal/whatsapp-senders/names",
		);
		return res.data;
	}

	public async getWhatsappSenderMessages(senderId: string, limit = 50, beforeId?: number | null) {
		const params = new URLSearchParams({ senderId, limit: String(limit) });
		if (beforeId) params.set("beforeId", String(beforeId));
		const { data: res } = await this.ax.get<
			DataResponse<PaginatedInternalWhatsappSenderMessages>
		>(`/api/internal/whatsapp-senders/messages?${params.toString()}`);
		return res.data;
	}

	public async assignWhatsappSenderName(senderId: string, name: string) {
		const { data: res } = await this.ax.put<DataResponse<InternalWhatsappSenderName>>(
			"/api/internal/whatsapp-senders/name",
			{ senderId, name },
		);
		return res.data;
	}

	public async sendMessageToInternalChat(data: InternalSendMessageData) {
		const url = `/api/internal/chats/${data.chatId}/messages`;
		const formData = new FormData();

		formData.append("chatId", data.chatId.toString());
		formData.append("text", data.text);
		data.quotedId && formData.append("quotedId", data.quotedId.toString());
		data.sendAsAudio && formData.append("sendAsAudio", "true");
		data.sendAsDocument && formData.append("sendAsDocument", "true");
		data.file && formData.append("file", data.file);
		data.fileId && formData.append("fileId", data.fileId.toString());
		data.traceId && formData.append("traceId", data.traceId);
		if (data.mentions && data.mentions.length > 0) {
  		formData.append("mentions", JSON.stringify(data.mentions));
		}
		await this.ax.post<DataResponse<InternalMessage>>(
			url,
			formData,
			{
				headers: {
					"Content-Type": "multipart/form-data",
					...(data.traceId ? { "x-upload-trace-id": data.traceId } : {}),
				},
				timeout: data.file
					? ApiClient.UPLOAD_TIMEOUT_MS
					: ApiClient.DEFAULT_TIMEOUT_MS,
			},
		);
	}

	public async updateInternalGroup(
		groupId: number,
		data: {
			name: string;
			participants: number[];
			wppGroupId: string | null;
		},
	) {
		const { data: res } = await this.ax.put<
			DataResponse<InternalGroup>
		>(`/api/internal/groups/${groupId}`, data);
		return res.data;
	}

	public async updateInternalGroupImage(groupId: number, file: File) {
		const formData = new FormData();
		formData.append("file", file);

		const { data: res } = await this.ax.put<
			DataResponse<InternalGroup>
		>(`/api/internal/groups/${groupId}/image`, formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
			timeout: ApiClient.UPLOAD_TIMEOUT_MS,
		});
		return res.data;
	}

	public async markChatMessagesAsRead(chatId: number) {
		const url = `/api/internal/chat/${chatId}/mark-as-read`;
		await this.ax.patch(url);
	}
	
	public async getInternalChatsMonitor() {
		const url = `/api/internal/monitor/chats`;
		const { data: response } = await this.ax.get<GetChatsResponse | InternalChatsPayload>(url);

		return this.normalizeChatsPayload(response);
	}
	
	public setAuth(token: string) {
		this.ax.defaults.headers.common["Authorization"] =
			`Bearer ${token}`;
	}
}
