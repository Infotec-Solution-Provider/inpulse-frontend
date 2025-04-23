import { WppMessageStatus } from "@in.pulse-crm/sdk";

function compareMessageStatus(prevStatus: WppMessageStatus, newStatus: WppMessageStatus) {
  if (prevStatus === "PENDING") {
    return newStatus;
  }
  if (prevStatus === "SENT" && newStatus !== "PENDING") {
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