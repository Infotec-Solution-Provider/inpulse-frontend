import { WppMessageStatus } from "@/lib/sdk-local";

function compareMessageStatus(prevStatus: WppMessageStatus, newStatus: WppMessageStatus) {
  if (prevStatus === "REVOKED" || newStatus === "REVOKED") return "REVOKED";
  if (newStatus === "ERROR") return "ERROR";
  if (prevStatus === "ERROR") return newStatus === "PENDING" ? prevStatus : newStatus;

  const statusOrder: Record<Exclude<WppMessageStatus, "ERROR" | "REVOKED">, number> = {
    PENDING: 0,
    SENT: 1,
    RECEIVED: 2,
    READ: 3,
    DOWNLOADED: 4,
  };

  return statusOrder[newStatus] >= statusOrder[prevStatus] ? newStatus : prevStatus;
}

export default compareMessageStatus;
