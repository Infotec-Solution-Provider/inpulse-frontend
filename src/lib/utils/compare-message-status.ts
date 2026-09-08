import { WppMessageStatus } from "@/lib/sdk-local";

function compareMessageStatus(prevStatus: WppMessageStatus, newStatus: WppMessageStatus) {
  if (
    ["SENT", "RECEIVED", "READ", "DOWNLOADED", "REVOKED"].includes(prevStatus) &&
    newStatus === "UNKNOWN"
  ) {
    return prevStatus;
  }
  if (prevStatus === "UNKNOWN" && newStatus === "PENDING") return prevStatus;
  if (prevStatus === "PENDING") {
    return newStatus;
  }
  if (prevStatus === "SENT" && newStatus === "PENDING") {
    return prevStatus;
  }
  if (prevStatus === "RECEIVED" && ["SENT", "PENDING"].includes(newStatus)) {
    return prevStatus;
  }
  if (prevStatus === "READ" && ["SENT", "PENDING", "RECEIVED"].includes(newStatus)) {
    return prevStatus;
  }

  return newStatus;
}

export default compareMessageStatus;
