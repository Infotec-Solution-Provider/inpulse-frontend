import { UsersClient } from "@/lib/sdk-local";
import { crmMutationConfig, type CrmRequestContext } from "@/lib/sdk-local/crm-request-context";
import { UserNotificationPreferences } from "@/lib/sdk-local/types/user.types";
import type { WebrtcConfig } from "../telephony/types";

const USERS_URL = process.env.NEXT_PUBLIC_USERS_URL || "http://localhost:8001";

/** "direct": browser -> WebRTC-capable PBX. "gateway": browser -> in.pulse gateway -> SIP PBX without WebRTC. */
export type WebrtcConnectionMode = "direct" | "gateway";

export interface TelephonyExtension { id: number; name: string; extension: string; version: number }
export interface TransferOption { key: string; name: string; extension: string; source: "operator" | "directory" }

export interface WebrtcSettingsDTO {
	allowAutoAnswer?: boolean;
	enabled: boolean;
	mode: WebrtcConnectionMode;
	websocketUrl: string;
	domain: string;
	pbxAddress: string;
	iceServers: Array<{ urls: string[]; username?: string; credential?: string }>;
	/** Read-only: whether this server has the gateway configured. Ignored on save. */
	gatewayAvailable?: boolean;
}

export interface SipConfigDTO {
	COD_CONFIG_SIP: number;
	COD_OPERADOR: number;
	RAMAL_SIP: string | null;
	IP_SERVIDOR_SIP: string | null;
	LOGIN_SIP: string | null;
	SENHA_SIP: string | null;
	USRID_SIP: string | null;
	CODECS_SIP: string | null;
	CFG_CONFIG_SIP: string | null;
}

export interface UpsertSipConfigPayload {
	RAMAL_SIP?: string | null;
	IP_SERVIDOR_SIP?: string | null;
	LOGIN_SIP?: string | null;
	SENHA_SIP?: string | null;
	USRID_SIP?: string | null;
	CODECS_SIP?: string | null;
	CFG_CONFIG_SIP?: string | null;
}

export interface GlobalSipConfigDTO {
	CODIGO: number;
	ASTERISK_SERVER: string | null;
	ASTERISK_PORTA: string | null;
	ASTERISK_PROXY: string | null;
	SIP_EMITE_BIP: string | null;
	SIP_VOLUME_AUTOMATICO: string | null;
	CALL_IN_DEVICE: string | null;
	CALL_OUT_DEVICE: string | null;
	RING_DEVICE: string | null;
	IP_TELNET: string | null;
	PORTA_TELNET: string | null;
	USUARIO_TELNET: string | null;
	SENHA_TELNET: string | null;
	PAUSARRAMAL: string | null;
	RAMALPAUSA: string | null;
	RAMALDESPAUSA: string | null;
	LIGACAO_IMEDIATA: string | null;
	SIP_ID: string | null;
	SIP_KEY: string | null;
	GRAVAR_LIGACAO: string | null;
}

export interface UpsertGlobalSipConfigPayload {
	ASTERISK_SERVER?: string | null;
	ASTERISK_PORTA?: string | null;
	ASTERISK_PROXY?: string | null;
	SIP_EMITE_BIP?: string | null;
	SIP_VOLUME_AUTOMATICO?: string | null;
	CALL_IN_DEVICE?: string | null;
	CALL_OUT_DEVICE?: string | null;
	RING_DEVICE?: string | null;
	IP_TELNET?: string | null;
	PORTA_TELNET?: string | null;
	USUARIO_TELNET?: string | null;
	SENHA_TELNET?: string | null;
	PAUSARRAMAL?: string | null;
	RAMALPAUSA?: string | null;
	RAMALDESPAUSA?: string | null;
	LIGACAO_IMEDIATA?: string | null;
	SIP_ID?: string | null;
	SIP_KEY?: string | null;
	GRAVAR_LIGACAO?: string | null;
}

export interface PushSubscriptionPayload {
	endpoint: string;
	expirationTime: number | null;
	keys: {
		auth: string;
		p256dh: string;
	};
}

export class FrontendUsersService extends UsersClient {
	public async getTelephonyExtensions(context?: CrmRequestContext): Promise<TelephonyExtension[]> { return (await this.ax.get<{data: TelephonyExtension[]}>("/api/telephony/extensions", context ? crmMutationConfig(context) : undefined)).data.data; }
	public async createTelephonyExtension(data: {name:string;extension:string}, context: CrmRequestContext) { return (await this.ax.post("/api/telephony/extensions",data,crmMutationConfig(context))).data.data; }
	public async changeTelephonyExtension(id:number,data:{name:string;extension:string;version:number}, context: CrmRequestContext) { return (await this.ax.patch(`/api/telephony/extensions/${id}`,data,crmMutationConfig(context))).data.data; }
	public async removeTelephonyExtension(id:number,version:number, context: CrmRequestContext) { await this.ax.delete(`/api/telephony/extensions/${id}`,{...crmMutationConfig(context),data:{version}}); }
	public async getTelephonyTransferOptions(context?: CrmRequestContext): Promise<TransferOption[]> { return (await this.ax.get<{data:TransferOption[]}>("/api/telephony/transfer-options",context ? crmMutationConfig(context) : undefined)).data.data; }
	public async getWebrtcSettings() {
		const response = await this.ax.get<{ data: WebrtcSettingsDTO }>("/api/telephony/webrtc-settings");
		return response.data.data;
	}

	public async saveWebrtcSettings(settings: WebrtcSettingsDTO) {
		const response = await this.ax.put<{ data: WebrtcSettingsDTO }>("/api/telephony/webrtc-settings", settings);
		return response.data.data;
	}

	public async getWebrtcConfig() {
		const response = await this.ax.get<{ data: WebrtcConfig }>("/api/telephony/webrtc-config");
		return response.data.data;
	}

	public async getUserNotificationPreferences(userId: number) {
		const response = await this.ax.get<{ message: string; data: UserNotificationPreferences }>(
			`/api/users/${userId}/notification-preferences`,
		);

		return response.data.data;
	}

	public async upsertUserNotificationPreferences(
		userId: number,
		payload: Partial<UserNotificationPreferences>,
	) {
		const response = await this.ax.put<{ message: string; data: UserNotificationPreferences }>(
			`/api/users/${userId}/notification-preferences`,
			payload,
		);

		return response.data.data;
	}

	public async getPushVapidPublicKey() {
		const response = await this.ax.get<{ data: { publicKey: string | null } }>(
			"/api/users/push/vapid-public-key",
		);

		return response.data.data.publicKey;
	}

	public async upsertPushSubscription(userId: number, payload: PushSubscriptionPayload) {
		await this.ax.post(`/api/users/${userId}/push-subscriptions`, payload);
	}

	public async getSipConfigs(filters?: Record<string, string>) {
		let url = "/api/sip-configs";

		if (filters) {
			const params = new URLSearchParams(filters);
			url += `?${params.toString()}`;
		}

		const response = await this.ax.get<{
			message: string;
			data: SipConfigDTO[];
			page: { totalRows: number; totalPages: number; current: number };
		}>(url);

		return response.data;
	}

	public async getUserSipConfig(userId: number) {
		const response = await this.ax.get<{ message: string; data: SipConfigDTO | null }>(
			`/api/users/${userId}/sip-config`
		);

		return response.data.data;
	}

	public async getGlobalSipConfig() {
		const response = await this.ax.get<{ message: string; data: GlobalSipConfigDTO | null }>(
			"/api/sip-global-config"
		);

		return response.data.data;
	}

	public async upsertUserSipConfig(userId: number, payload: UpsertSipConfigPayload) {
		const response = await this.ax.put<{ message: string; data: SipConfigDTO }>(
			`/api/users/${userId}/sip-config`,
			payload
		);

		return response.data.data;
	}

	public async upsertGlobalSipConfig(payload: UpsertGlobalSipConfigPayload) {
		const response = await this.ax.put<{ message: string; data: GlobalSipConfigDTO }>(
			"/api/sip-global-config",
			payload
		);

		return response.data.data;
	}
}

const usersService = new FrontendUsersService(USERS_URL);

export default usersService;
