export interface ReportPeriod {
  startDate: string;
  endDate: string;
}

export function civilDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function defaultReportPeriod(now = new Date()): ReportPeriod {
  return {
    startDate: civilDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: civilDate(now),
  };
}

function validCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && civilDate(date) === value;
}

export function validateReportPeriod(value: ReportPeriod): string | null {
  if (!validCivilDate(value.startDate) || !validCivilDate(value.endDate))
    return "Informe datas inicial e final válidas.";
  if (value.startDate > value.endDate)
    return "A data inicial deve ser anterior ou igual à data final.";
  return null;
}

// UTC is used only for arithmetic on civil dates, never for formatting local today.
export function previousReportPeriod(value: ReportPeriod): ReportPeriod {
  const start = Date.parse(`${value.startDate}T00:00:00Z`);
  const end = Date.parse(`${value.endDate}T00:00:00Z`);
  const previousEnd = start - 86400000;
  return {
    startDate: new Date(previousEnd - (end - start)).toISOString().slice(0, 10),
    endDate: new Date(previousEnd).toISOString().slice(0, 10),
  };
}

export function reportPeriodShortcut(id: string, now = new Date()): ReportPeriod {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (id === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (id === "last7") start.setDate(start.getDate() - 6);
  else if (id === "previousMonth") {
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    end.setDate(0);
  } else if (id === "month") start.setDate(1);
  return { startDate: civilDate(start), endDate: civilDate(end) };
}

export function csvContent(headers: string[], rows: unknown[][]) {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@-]/.test(text) && typeof value !== "number") text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
}

export function downloadReportCsv(filename: string, headers: string[], rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob([csvContent(headers, rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
