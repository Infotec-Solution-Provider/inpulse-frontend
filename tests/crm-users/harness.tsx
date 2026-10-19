import { PilotDesignProvider } from "../../src/lib/ui-system";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import darkTheme from "../../src/lib/themes/dark";
import CrmUserCatalogManagement from "../../src/lib/components/crm-user-catalog-management";
import CrmUserRegistrationDialog from "../../src/lib/components/crm-user-registration-dialog";
import { AuthContext, switchAuth, useAuthContext } from "./doubles";
import type { CrmUserCatalogName } from "../../src/lib/sdk-local/types/crm-users.types";
import { useState } from "react";
import UserModal from "../../src/app/(private)/[instance]/(cruds)/users/(modal)/user-modal";
import type { User } from "../../src/lib/sdk-local/types/user.types";
import TelephoneFinishModal from "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-finish-modal";
import FinishChatModal from "../../src/app/(private)/[instance]/(main)/(chat)/(actions)/finish-chat-modal";
import type { TelephoneQueueItem } from "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-dialer.types";
const params = new URLSearchParams(location.search);
function Harness() {
  const auth = useAuthContext();
  const { instance, user } = auth;
  const [open, setOpen] = useState(true);
  return (
    <AuthContext.Provider value={auth}>
      <div style={{ height: "100dvh", paddingTop: 34 }}>
        <div style={{ position: "fixed", zIndex: 9999, top: 0, right: 0 }}>
          <button onClick={() => switchAuth("tenant-b", "token-b")}>Trocar tenant</button>
          <button onClick={() => switchAuth("tenant-a", "refreshed-token")}>Renovar sessão</button>
          <button onClick={() => switchAuth("tenant-a", "token-a", 8)}>Trocar usuário</button>
        </div>
        {params.get("finish") === "telephone" ? (
          <TelephoneFinishModal
            appointment={{ contactName: "Teste", phone: "11999999999" } as TelephoneQueueItem}
            onConfirm={async (resultId, scheduleDate, operationId, finishedAt) => {
              window.userTest.finishRequests.push({ operationId, finishedAt });
              if (window.userTest.finishFailure)
                throw {
                  response: {
                    status: window.userTest.finishFailure,
                    data: window.userTest.finishFailure >= 500 ? { outcome: "UNKNOWN" } : {},
                  },
                };
              window.userTest.finishes.push({ resultId, scheduleDate: scheduleDate ?? null });
            }}
            onCheckConfirmation={async (operationId) => {
              window.userTest.finishChecks.push(operationId);
              return window.userTest.finishStatus;
            }}
          />
        ) : params.get("finish") === "chat" ? (
          <FinishChatModal chatId={42} />
        ) : params.has("legacy-modal") ? (
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
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={params.has("dark") ? darkTheme : lightTheme}>
    <CssBaseline />
    <PilotDesignProvider style={{ height: "100dvh" }}>
      <Harness />
    </PilotDesignProvider>
  </ThemeProvider>,
);
