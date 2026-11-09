"use client";
import { CrmPage, UiIcon } from "@/lib/ui-system";
import { useCustomersContext } from "./customers-context";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { AppContext } from "../../app-context";
import { useContext } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import CreateCustomerModal from "./(table)/(modal)/create-customer-modal";
import CustomersTable from "./(table)/table";
export default function CustomersManagementPage() {
  const { parameters } = useWhatsappContext();
  const fullRegistration = isFeatureEnabled(parameters, FEATURE_FLAGS.crmCustomers);
  const { state } = useCustomersContext(),
    { user, instance } = useAuthContext(),
    { openModal } = useContext(AppContext),
    router = useRouter();
  const create = () =>
    user?.NIVEL === "ADMIN" && fullRegistration
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
