import customersService, { ScheduleAvailability } from "@/lib/services/customers.service";
export function availabilityError(data: ScheduleAvailability, value: string): string | null {
  const [day, time] = value.split("T");
  if (!day || !time || !/^\d{2}:\d{2}$/.test(time) || !data.periods.some(p => time >= p.start && time < p.end)) return "Selecione um horário dentro do expediente.";
  if (new Date(value).getTime() <= Date.now()) return "Selecione um horário futuro.";
  const count = data.appointments.filter(a => a.startsWith(day + "T")).length;
  if (data.blockDailyLimit && data.dailyLimit > 0 && count >= data.dailyLimit) return "O limite diário de agendamentos foi atingido.";
  return null;
}
export async function validateScheduleAvailability(value: string) {
  const day = value.slice(0,10);
  const data = await customersService.scheduleAvailability(day, day);
  const error = availabilityError(data, value);
  if (error) throw new Error(error);
}


