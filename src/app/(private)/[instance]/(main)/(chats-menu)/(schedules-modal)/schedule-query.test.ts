import { describe, expect, it } from "vitest";
import {
  emptyScheduleFilters,
  formatScheduleDate,
  initialScheduleQuery,
  scheduleTimeLabel,
  scheduleQueryKey,
  serializeScheduleQuery,
  validateScheduleFilters,
} from "./schedule-query";

describe("consulta pessoal de agendamentos", () => {
  it("serializa a busca e critérios reais do CRM sem campos automáticos ou campanha duplicada", () => {
    const query = initialScheduleQuery();
    query.filters.search = "  Clínica São João  ";
    query.filters.channels = "WHATSAPP";
    query.filters.customerCampaignIds = ["2", "7"];
    query.filters.customer = {
      CODIGO: "-5",
      CPF_CNPJ: "12345678901",
      COD_ERP: "ABC%",
      CIDADE: "São Paulo",
      ATIVO: "SIM",
      PESSOA: "JUR",
    };
    query.filters.business = {
      ...query.filters.business,
      campaignIds: [99],
      purchaseStatus: "with_purchases",
      purchaseFrom: "2026-01-01",
      purchaseTo: "2026-11-13",
      registeredFrom: "2025-01-01",
      registeredTo: "2026-11-13",
      segmentIds: [0, 7],
      loyaltyOperatorIds: [4, 8],
      groupIds: [-2, 0],
      originIds: [3],
      mediaIds: [4],
      brandIds: [5],
      unitIds: [6],
      positionIds: [7],
      states: ["RS", "SP"],
      phone: " 51999990000 ",
      email: " @teste.local ",
    };
    expect(serializeScheduleQuery(query)).toEqual({
      view: "crm",
      page: "1",
      perPage: "10",
      period: "all",
      sortOrder: "asc",
      search: "Clínica São João",
      channels: "WHATSAPP",
      customerCampaignIds: "2,7",
      CODIGO: "-5",
      CPF_CNPJ: "12345678901",
      COD_ERP: "ABC%",
      CIDADE: "São Paulo",
      ATIVO: "SIM",
      PESSOA: "JUR",
      purchaseStatus: "with_purchases",
      purchaseFrom: "2026-01-01",
      purchaseTo: "2026-11-13",
      registeredFrom: "2025-01-01",
      registeredTo: "2026-11-13",
      segmentIds: "0,7",
      loyaltyOperatorIds: "4,8",
      groupIds: "-2,0",
      originIds: "3",
      mediaIds: "4",
      brandIds: "5",
      unitIds: "6",
      positionIds: "7",
      states: "RS,SP",
      phone: "51999990000",
      email: "@teste.local",
    });
  });
  it("ignora campos automáticos legados e usa namespace v2 sem recuperar consulta antiga", () => {
    const query = initialScheduleQuery();
    Object.assign(query.filters, {
      profileLevel: "consolidado",
      interactionLevel: "interacao_alta",
      purchaseLevel: "muitas_compras",
      ageLevel: "cliente_novo",
      purchaseInterestLevel: "alto_interesse",
      repurchaseStatuses: ["green"],
    });
    const result = serializeScheduleQuery(query);
    for (const key of [
      "profileLevel",
      "interactionLevel",
      "purchaseLevel",
      "ageLevel",
      "purchaseInterestLevel",
      "repurchaseStatuses",
      "campaignIds",
    ])
      expect(result).not.toHaveProperty(key);
    expect(scheduleQueryKey("tenant:1")).toBe("operator-schedules:v2:tenant:1");
    expect(scheduleQueryKey("tenant:1")).not.toBe("operator-schedules:tenant:1");
  });
  it("valida os períodos de compra e cadastro sem confundir com agendamento", () => {
    const query = initialScheduleQuery();
    query.filters.business.purchaseFrom = "2026-11-14";
    query.filters.business.purchaseTo = "2026-11-13";
    expect(validateScheduleFilters(query.filters)).toContain("compra");
    query.filters.business.purchaseStatus = "without_purchases";
    expect(validateScheduleFilters(query.filters)).toBeNull();
    expect(serializeScheduleQuery(query)).not.toHaveProperty("purchaseFrom");
    query.filters.business.registeredFrom = "2026-02-30";
    expect(validateScheduleFilters(query.filters)).toContain("cadastro");
  });
  it("rejeita telefone curto e preserva IDs zero e negativos dos catálogos CRM", () => {
    const query = initialScheduleQuery();
    query.filters.business.phone = "12";
    expect(validateScheduleFilters(query.filters)).toContain("três dígitos");
    query.filters.business.phone = "(51) 99999-0000";
    query.filters.business.groupIds = [0, -2];
    expect(serializeScheduleQuery(query).groupIds).toBe("0,-2");
  });
  it("converte dias inclusivos em Brasília para limites UTC sem depender do browser", () => {
    const query = initialScheduleQuery();
    query.filters = {
      ...query.filters,
      period: "custom",
      dateFrom: "2026-11-13",
      dateTo: "2026-11-13",
    };
    expect(serializeScheduleQuery(query)).toMatchObject({
      scheduledFrom: "2026-11-13T03:00:00.000Z",
      scheduledTo: "2026-11-14T03:00:00.000Z",
    });
  });
  it("avança corretamente o limite exclusivo na virada do mês e do ano", () => {
    const query = initialScheduleQuery();
    query.filters = {
      ...query.filters,
      period: "custom",
      dateFrom: "2026-12-31",
      dateTo: "2026-12-31",
    };
    expect(serializeScheduleQuery(query).scheduledTo).toBe("2027-01-01T03:00:00.000Z");
  });
  it("rejeita datas impossíveis, limites invertidos e datas incompletas antes do HTTP", () => {
    for (const [dateFrom, dateTo] of [
      ["2026-02-30", "2026-03-01"],
      ["2026-11-15", "2026-11-13"],
      ["", "2026-11-13"],
    ]) {
      const query = initialScheduleQuery();
      query.filters = { ...query.filters, period: "custom", dateFrom, dateTo };
      expect(validateScheduleFilters(query.filters)).toBeTruthy();
      expect(() => serializeScheduleQuery(query)).toThrow();
    }
  });
  it("não envia datas ocultas ao mudar de período personalizado para um atalho", () => {
    const query = initialScheduleQuery();
    query.filters = { ...query.filters, period: "today", dateFrom: "inválida", dateTo: "inválida" };
    expect(serializeScheduleQuery(query)).not.toHaveProperty("scheduledFrom");
    expect(serializeScheduleQuery(query)).not.toHaveProperty("scheduledTo");
  });
  it("limpar tudo remove busca e todos os predicados e cria arrays independentes", () => {
    const first = emptyScheduleFilters();
    first.customerCampaignIds.push("7");
    first.search = "cliente";
    expect(emptyScheduleFilters()).toMatchObject({
      search: "",
      period: "all",
      customerCampaignIds: [],
      business: expect.objectContaining({ groupIds: [], purchaseStatus: "" }),
      sortOrder: "asc",
    });
  });
  it("formata pelo fuso de negócio e tolera datas inválidas", () => {
    expect(formatScheduleDate("2026-11-14T01:30:00Z")).toBe("13/11/2026, 22:30");
    expect(formatScheduleDate("inválida")).toBe("Data indisponível");
  });
  it("prioriza atraso sobre hoje usando referência do servidor e não o relógio do browser", () => {
    const reference = "2026-11-14T01:30:00Z";
    expect(scheduleTimeLabel({ scheduleAt: "2026-11-14T01:00:00Z" }, reference)).toBe("Atrasado");
    expect(scheduleTimeLabel({ scheduleAt: reference }, reference)).toBe("Hoje");
    expect(scheduleTimeLabel({ scheduleAt: "2026-11-14T03:00:00Z" }, reference)).toBe("Futuro");
    expect(scheduleTimeLabel({ scheduleAt: "inválida" }, reference)).toBe("Horário a confirmar");
  });
});
