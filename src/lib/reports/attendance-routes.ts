export const attendanceReportPaths = {
  messagesPerContact: "messages-per-contact",
  messagesPerHourDay: "messages-per-hour-day",
  contactsAwaitingReturn: "contacts-awaiting-return",
} as const;

export type AttendanceReportId = keyof typeof attendanceReportPaths;

export function migratedDashboardPath(key: string): string | undefined {
  if (key === "messagesPerUser") return "messages-per-operator";
  return Object.hasOwn(attendanceReportPaths, key)
    ? attendanceReportPaths[key as AttendanceReportId]
    : undefined;
}
