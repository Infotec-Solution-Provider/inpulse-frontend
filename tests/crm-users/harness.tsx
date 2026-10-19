import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import darkTheme from "../../src/lib/themes/dark";
import CrmUserCatalogManagement from "../../src/lib/components/crm-user-catalog-management";
import CrmUserRegistrationDialog from "../../src/lib/components/crm-user-registration-dialog";
import { switchAuth, useAuthContext } from "./doubles";
import type { CrmUserCatalogName } from "../../src/lib/sdk-local/types/crm-users.types";
import { useState } from "react";
import UserModal from "../../src/app/(private)/[instance]/(cruds)/users/(modal)/user-modal";
import type { User } from "../../src/lib/sdk-local/types/user.types";
const params = new URLSearchParams(location.search);
function Harness() {
  const { instance, user } = useAuthContext();
  const [open, setOpen] = useState(true);
  return (
    <div style={{ height: "100dvh", paddingTop: 34 }}>
      <div style={{ position: "fixed", zIndex: 9999, top: 0, right: 0 }}>
        <button onClick={() => switchAuth("tenant-b", "token-b")}>Trocar tenant</button>
        <button onClick={() => switchAuth("tenant-a", "refreshed-token")}>Renovar sessão</button>
        <button onClick={() => switchAuth("tenant-a", "token-a", 8)}>Trocar usuário</button>
      </div>
      {params.has("legacy-modal") ? (
        <UserModal user={{ CODIGO: 42 } as User} />
      ) : params.has("registration") ? (
        open ? (
          <CrmUserRegistrationDialog
            key={`${instance}:${user.CODIGO}`}
            userId={params.has("new") ? undefined : 42}
            sectors={[{ id: 2, name: "Atendimento" }]}
            onClose={() => setOpen(false)}
            onSaved={() => {
              window.userTest.saved += 1;
            }}
          />
        ) : (
          <p>Cadastro fechado</p>
        )
      ) : (
        <CrmUserCatalogManagement
          catalog={(params.get("catalog") ?? "user-groups") as CrmUserCatalogName}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={params.has("dark") ? darkTheme : lightTheme}>
    <CssBaseline />
    <Harness />
  </ThemeProvider>,
);
