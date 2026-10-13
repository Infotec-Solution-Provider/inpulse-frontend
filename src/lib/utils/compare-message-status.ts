import { WppMessageStatus } from "@/lib/sdk-local";

function compareMessageStatus(prevStatus: WppMessageStatus, newStatus: WppMessageStatus): WppMessageStatus {
  if (prevStatus === "REVOKED" || newStatus === "REVOKED") return "REVOKED";
  if (newStatus === "ERROR") return "ERROR";
  // A retry status event deliberately leaves ERROR and clears its retry hint.
  if (prevStatus === "ERROR") return newStatus;
  const rank: Record<Exclude<WppMessageStatus, "ERROR" | "REVOKED">, number> = {
    PENDING: 0, UNKNOWN: 0.5, SENT: 1, RECEIVED: 2, READ: 3, DOWNLOADED: 4,
  };
  return rank[newStatus] >= rank[prevStatus] ? newStatus : prevStatus;
}

export default compareMessageStatus;
