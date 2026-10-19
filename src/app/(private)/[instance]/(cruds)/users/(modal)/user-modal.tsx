"use client";
import { useAuthContext } from "@/app/auth-context";
import CrmUserRegistrationDialog from "@/lib/components/crm-user-registration-dialog";
import type { User } from "@/lib/sdk-local";
import { useUsersContext } from "../users-context";
export default function UserModal({ user }: { user?: User }) {
  const { instance, user: actor } = useAuthContext();
  const { closeModal, sectors, loadUsers } = useUsersContext();
  return <CrmUserRegistrationDialog key={`${instance}:${actor?.CODIGO}:${user?.CODIGO ?? "new"}`} userId={user?.CODIGO} sectors={sectors} onClose={closeModal} onSaved={loadUsers} />;
}
