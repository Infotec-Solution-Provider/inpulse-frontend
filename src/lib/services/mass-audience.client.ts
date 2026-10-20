import axios from "axios";
import type {
  AudienceContact,
  AudienceDefinitionV2,
  AudienceFilters,
  AudienceSummary,
} from "@/lib/mass-audience";
import type marketingService from "./marketing.service";
import type { MarketingCampaign } from "./marketing.service";

export interface AudienceSearchResponse {
  data: AudienceContact[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: AudienceSummary;
}
export interface AudienceCreationSummary {
  selected: number;
  eligible: number;
  blocked: number;
  skipped: number;
  skippedReasons: { CONTACT_NOT_FOUND: number; MISSING_PHONE: number };
}
export type AudienceCampaignPayload = Omit<
  Parameters<typeof marketingService.createCampaign>[0],
  "audienceDefinition"
> & { audienceDefinition: AudienceDefinitionV2 };

const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005";
const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:8007";
const headers = (token: string) => ({
  authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
});
const countsValid = (value: unknown, keys: string[]) =>
  Boolean(
    value &&
      typeof value === "object" &&
      keys.every(
        (key) =>
          Number.isSafeInteger((value as Record<string, number>)[key]) &&
          (value as Record<string, number>)[key] >= 0,
      ),
  );

/** Dedicated v2 routes: unsupported servers must fail closed, never widen to a legacy audience. */
export default class MassAudienceClient {
  async search(
    token: string,
    filters: AudienceFilters,
    page: number,
    perPage: number,
    signal?: AbortSignal,
  ): Promise<AudienceSearchResponse> {
    const { data } = await axios.post<AudienceSearchResponse>(
      `${whatsappUrl.replace(/\/$/, "")}/api/whatsapp/contacts/customer/search`,
      { ...filters, pagination: { page, perPage } },
      { headers: headers(token), signal },
    );
    if (
      !Array.isArray(data?.data) ||
      !data.data.every(
        (contact) =>
          Number.isSafeInteger(contact.id) &&
          contact.id > 0 &&
          typeof contact.isBlocked === "boolean" &&
          (contact.phone === null || typeof contact.phone === "string"),
      ) ||
      !countsValid(data.summary, ["total", "eligible", "blocked", "skipped"]) ||
      !countsValid(data.pagination, ["page", "perPage", "total", "totalPages"]) ||
      typeof data.pagination.hasNext !== "boolean" ||
      typeof data.pagination.hasPrev !== "boolean" ||
      data.pagination.page !== page ||
      data.pagination.perPage !== perPage ||
      data.summary.total !== data.pagination.total ||
      data.summary.eligible + data.summary.blocked + data.summary.skipped !== data.summary.total
    )
      throw new Error(
        "Resposta de público incompatível. Atualize os serviços antes de criar disparos.",
      );
    return data;
  }

  async create(
    token: string,
    payload: AudienceCampaignPayload,
  ): Promise<{ data: MarketingCampaign; summary: AudienceCreationSummary }> {
    const { data } = await axios.post<{
      data: MarketingCampaign;
      summary: AudienceCreationSummary;
    }>(`${marketingUrl.replace(/\/$/, "")}/api/marketing/campaigns/with-audience`, payload, {
      headers: headers(token),
    });
    if (
      !Number.isSafeInteger(data?.data?.id) ||
      data.data.id <= 0 ||
      !countsValid(data.summary, ["selected", "eligible", "blocked", "skipped"]) ||
      !countsValid(data.summary.skippedReasons, ["CONTACT_NOT_FOUND", "MISSING_PHONE"]) ||
      data.summary.skippedReasons.CONTACT_NOT_FOUND + data.summary.skippedReasons.MISSING_PHONE !==
        data.summary.skipped ||
      data.summary.eligible + data.summary.blocked + data.summary.skipped !== data.summary.selected
    )
      throw new Error(
        "Resultado do cadastro não confirmado. Confira a lista antes de tentar novamente.",
      );
    return data;
  }
}
