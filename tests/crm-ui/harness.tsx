import "../monitor/harness.css";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ThemeProvider } from "../../src/app/theme-context";
import { PilotDesignProvider, CrmQueryProvider } from "../../src/lib/ui-system";
import Shell from "../../src/lib/ui-system/monitor-shell";
import CustomersProvider from "../../src/app/(private)/[instance]/(cruds)/customers/customers-context";
import CustomersPage from "../../src/app/(private)/[instance]/(cruds)/customers/page";
import SegmentPage from "../../src/app/(private)/[instance]/(cruds)/customer-segments/page";
import UserCatalog from "../../src/lib/components/crm-user-catalog-management";
import UsersProvider from "../../src/app/(private)/[instance]/(cruds)/users/users-context";
import UsersPage from "../../src/app/(private)/[instance]/(cruds)/users/page";
import CustomerManagement from "../../src/lib/components/crm-customer-management";
import { CrmLeaveGuardProvider } from "../../src/lib/ui-system/leave-guard";
import Catalog from "../../src/lib/components/crm-catalog-management";
import { isCrmCatalog } from "../../src/lib/crm-catalogs-form";
import { navigate, usePathname } from "../monitor/navigation-doubles";
import { AuthContext, AppContext } from "./doubles";
navigate("/tenant-a/customers");
function Harness() {
  const [actor, setActor] = useState(1),
    [tenant, setTenant] = useState("tenant-a"),
    [role, setRole] = useState("ADMIN"),
    [modal, setModal] = useState<unknown>(null);
  const path = usePathname(),
    catalog = path.split("/").at(-1)!;
  Object.assign(window, {
    crmUiTest: {
      navigate,
      switchTenant: (value: string) => {
        setTenant(value);
        navigate(`/${value}/customers`);
      },
      switchActor: setActor,
      setRole,
    },
  });
  const content = path.endsWith("/customers") ? (
    <CustomersPage />
  ) : path.endsWith("/users") ? (
    <UsersProvider key={`${tenant}:${actor}`}>
      <UsersPage />
    </UsersProvider>
  ) : path.includes("/crm-customers/") ? (
    <CustomerManagement customerId={path.endsWith("/new") ? undefined : Number(catalog)} />
  ) : path.includes("/user-catalogs/") ? (
    <UserCatalog catalog={catalog as "shifts"} />
  ) : path.endsWith("/customer-segments") ? (
    <SegmentPage />
  ) : path.includes("/crm-catalogs/") && isCrmCatalog(catalog) ? (
    <Catalog catalog={catalog} />
  ) : (
    <section className="ip-crud-page">
      <h1>Prévia de navegação</h1>
      <p>Destino: {path}</p>
      <p>Os dados são fictícios; esta etapa demonstra Clientes, Segmentos e catálogos.</p>
      <button onClick={() => navigate(`/${tenant}/customers`)}>Voltar à lista</button>
    </section>
  );
  return (
    <AuthContext.Provider
      value={{
        instance: tenant,
        token: `fixture-${tenant}-${actor}`,
        status: "authenticated",
        user: { CODIGO: actor, NOME: "Supervisão demonstrativa", NIVEL: role },
        signOut: () => {},
      }}
    >
      <AppContext.Provider
        value={{ modal: modal as never, openModal: setModal, closeModal: () => setModal(null) }}
      >
        <ThemeProvider>
          <CrmQueryProvider scope={`${tenant}:${actor}`}>
            <CustomersProvider>
              <CrmLeaveGuardProvider scope={`${tenant}:${actor}`} navigate={navigate}>
                <Shell>
                  <PilotDesignProvider>{content}</PilotDesignProvider>
                </Shell>
              </CrmLeaveGuardProvider>
            </CustomersProvider>
          </CrmQueryProvider>
        </ThemeProvider>
      </AppContext.Provider>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
