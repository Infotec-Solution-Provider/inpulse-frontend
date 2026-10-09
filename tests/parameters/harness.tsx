import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ParametersPage from "../../src/app/(private)/[instance]/(cruds)/parameters/page";
import "../telephony/harness.css";

const dark = new URLSearchParams(location.search).has("dark");
document.documentElement.classList.toggle("dark", dark);
const theme = createTheme({
  palette: { mode: dark ? "dark" : "light", primary: { main: "#0891b2" } },
});
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <ParametersPage />
    <ToastContainer />
  </ThemeProvider>,
);
