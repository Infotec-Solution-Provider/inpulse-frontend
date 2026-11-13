import { describe, expect, it } from "vitest";
import {
  emptyScheduleFilters,
  formatScheduleDate,
  initialScheduleQuery,
  scheduleTimeLabel,
  serializeScheduleQuery,
  validateScheduleFilters,
} from "./schedule-query";

describe("consulta pessoal de agendamentos", () => {
  it("serializa busca global e filtros combinados sem permitir selecionar outro usuário ou setor", () => {
    const query = initialScheduleQuery();
    query.filters = {
      ...query.filters,
      search: "  Clínica São João  ",
      channels: "WHATSAPP",
      customerCampaignIds: ["2", "7"],
      purchaseLevel: "sem_compras",
      repurchaseStatuses: ["neutral"],
    };
    expect(serializeScheduleQuery(query)).toEqual({
      page: "1",
      perPage: "10",
      period: "all",
      sortOrder: "asc",
      search: "Clínica São João",
      channels: "WHATSAPP",
      customerCampaignIds: "2,7",
      purchaseLevel: "sem_compras",
      repurchaseStatuses: "neutral",
    });
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
      repurchaseStatuses: [],
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
