"use client";
import { useAuthContext } from "@/app/auth-context";
import CrmUserRegistrationDialog from "@/lib/components/crm-user-registration-dialog";
import { useWhatsappContext } from "../../../whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import LegacyUserModal from "./legacy-user-modal";
import type { User } from "@/lib/sdk-local";
import { useEffect, useRef } from "react";
import { useUsersContext } from "../users-context";
export default function UserModal({ user }: { user?: User }) {
  const { instance, user: actor } = useAuthContext();
  const { loaded, parameters } = useWhatsappContext();
  const { closeModal, sectors, loadUsers } = useUsersContext();
  const scope = JSON.stringify([instance, actor?.CODIGO]);
  const openedScope = useRef(scope).current;
  const changed = openedScope !== scope;
  useEffect(() => {
    if (changed) closeModal();
  }, [changed, closeModal]);
  // A numeric ID belongs to the tenant that opened the form. Do not resolve it
  // again in another session merely because the containing provider survived.
  if (changed || !loaded) return null;
  if (!isFeatureEnabled(parameters, FEATURE_FLAGS.crmUsers)) return <LegacyUserModal key={openedScope} user={user} />;
  return (
    <CrmUserRegistrationDialog
      key={`${openedScope}:${user?.CODIGO ?? "new"}`}
      userId={user?.CODIGO}
      sectors={sectors}
      onClose={closeModal}
      onSaved={loadUsers}
    />
  );
}
