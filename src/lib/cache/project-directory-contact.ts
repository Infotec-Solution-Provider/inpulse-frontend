import { WppContact } from "@/lib/sdk-local";

export default function projectDirectoryContact(contact: WppContact): WppContact {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    customerId: contact.customerId,
    avatarUrl: contact.avatarUrl,
    instance: contact.instance,
    isBlocked: contact.isBlocked,
    isOnlyAdmin: contact.isOnlyAdmin,
    sectors: contact.sectors,
    sectorIds: contact.sectorIds,
  };
}
