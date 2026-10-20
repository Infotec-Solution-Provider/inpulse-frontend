import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MassAudienceClient from "./mass-audience.client";
import {
  buildAudienceDefinition,
  emptyAudienceFilters,
  emptyAudienceSelection,
} from "@/lib/mass-audience";
import { crmError } from "@/lib/crm-marketing-form";

afterEach(() => vi.restoreAllMocks());
describe("dedicated mass audience client", () => {
  it("sends complete criteria in POST without the truncated SDK or URL ID lists", async () => {
    const post = vi
      .spyOn(axios, "post")
      .mockResolvedValue({
        data: {
          data: [],
          pagination: {
            page: 2,
            perPage: 8,
            total: 10,
            totalPages: 2,
            hasNext: false,
            hasPrev: true,
          },
          summary: { total: 10, eligible: 8, blocked: 1, skipped: 1 },
        },
      });
    const filters = {
      contactFilters: { sectorIds: [1, 2], hasCustomer: false },
      customerFilters: {
        RAZAO: "Cliente",
        groupIds: "3,4",
        states: "SP,RS",
        phone: "1199",
        email: "@local",
      },
    };
    await new MassAudienceClient().search("token", filters, 2, 8);
    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith(
      expect.stringMatching(/\/contacts\/customer\/search$/),
      { ...filters, pagination: { page: 2, perPage: 8 } },
      expect.objectContaining({ headers: { authorization: "Bearer token" } }),
    );
  });
  it("rejects legacy or malformed responses and never falls back", async () => {
    const post = vi
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { data: [], pagination: { total: 50 } } });
    await expect(
      new MassAudienceClient().search("token", emptyAudienceFilters(), 1, 8),
    ).rejects.toThrow(/incompatível/);
    expect(post).toHaveBeenCalledOnce();
  });
  it("creation uses only the atomic route and a known write becomes unknown on invalid success envelope", async () => {
    const post = vi
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { data: { id: 9 } }, status: 201 });
    const payload = {
      name: "Teste",
      audienceDefinition: buildAudienceDefinition(emptyAudienceFilters(), emptyAudienceSelection()),
    };
    const error = await new MassAudienceClient()
      .create("Bearer token", payload)
      .catch((value) => value);
    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith(
      expect.stringMatching(/\/campaigns\/with-audience$/),
      payload,
      { headers: { authorization: "Bearer token" } },
    );
    expect(crmError(error).reconcile).toBe(true);
  });
});
