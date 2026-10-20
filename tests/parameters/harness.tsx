import { PilotDesignProvider } from "../../src/lib/ui-system/provider";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import darkTheme from "../../src/lib/themes/dark";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ParametersPage from "../../src/app/(private)/[instance]/(cruds)/parameters/page";
import "../telephony/harness.css";

const dark = new URLSearchParams(location.search).has("dark");
document.documentElement.classList.toggle("dark", dark);
const theme = dark ? darkTheme : lightTheme;
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <PilotDesignProvider style={{ height: "100dvh", overflowY: "auto" }}>
      <ParametersPage />
    </PilotDesignProvider>
    <ToastContainer />
  </ThemeProvider>,
);
