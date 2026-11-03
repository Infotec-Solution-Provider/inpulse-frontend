import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { PilotDesignProvider } from "../../src/lib/ui-system";
import theme from "../../src/lib/themes/light";
import AdministrationPage from "../../src/lib/components/crm-administration";
import { switchAuth } from "./doubles";
import { navigate } from "../monitor/navigation-doubles";
navigate("/tenant-a/crm-administration");
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <PilotDesignProvider>
      <Box />
      <AdministrationPage />
    </PilotDesignProvider>
  </ThemeProvider>,
);
function Box() {
  return (
    <div>
      <button onClick={() => switchAuth("tenant-b", "token-b")}>Trocar tenant</button>
      <button onClick={() => switchAuth("tenant-a", "token-a", "ATIVO")}>Operador comum</button>
    </div>
  );
}
