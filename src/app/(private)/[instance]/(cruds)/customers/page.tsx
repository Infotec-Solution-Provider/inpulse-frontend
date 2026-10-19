"use client";
import { CrmPage, UiIcon } from "@/lib/ui-system";
import { useCustomersContext } from "./customers-context";
import { useAuthContext } from "@/app/auth-context";
import { AppContext } from "../../app-context";
import { useContext } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import CreateCustomerModal from "./(table)/(modal)/create-customer-modal";
import CustomersTable from "./(table)/table";
export default function CustomersManagementPage() {
  const { state } = useCustomersContext(),
    { user, instance } = useAuthContext(),
    { openModal } = useContext(AppContext),
    router = useRouter();
  const create = () =>
    user?.NIVEL === "ADMIN"
      ? router.push(`/${instance}/crm-customers/new`)
      : openModal(<CreateCustomerModal />);
  return (
    <CrmPage
      title="Clientes"
      description="Consulte e mantenha os clientes e seus dados comerciais."
      count={state.isLoading ? undefined : state.totalRows}
      actions={
        <Button
          onClick={create}
          variant="contained"
          startIcon={<UiIcon name="add" scale="toolbar" />}
        >
          Novo cliente
        </Button>
      }
    >
      <CustomersTable />
    </CrmPage>
  );
}
