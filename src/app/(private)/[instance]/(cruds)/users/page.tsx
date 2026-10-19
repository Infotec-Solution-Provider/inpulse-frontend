"use client";
import { CrmPage, UiIcon } from "@/lib/ui-system";
import { Button } from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import { useUsersContext } from "./users-context";
import UsersTable from "./(table)/table";
export default function UsersManagementPage() {
  const { user } = useAuthContext(),
    { state, openUserModal } = useUsersContext();
  return (
    <CrmPage
      title="Usuários"
      description="Organize a equipe, os acessos e as associações no CRM."
      count={state.isLoading ? undefined : state.totalRows}
      actions={
        user?.NIVEL === "ADMIN" ? (
          <Button
            variant="contained"
            startIcon={<UiIcon name="add" scale="toolbar" />}
            onClick={() => openUserModal()}
          >
            Novo usuário
          </Button>
        ) : undefined
      }
    >
      <UsersTable />
    </CrmPage>
  );
}
