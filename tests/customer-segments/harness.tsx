import { createRoot } from "react-dom/client";
import { useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import darkTheme from "../../src/lib/themes/dark";
import CustomerSegmentsPage from "../../src/app/(private)/[instance]/(cruds)/customer-segments/page";
import CustomerSegmentSelector from "../../src/lib/components/customer-segment-selector";
import "./doubles";
import "../telephony/harness.css";

const dark = new URLSearchParams(location.search).has("dark");
const selector = new URLSearchParams(location.search).has("selector");
function SelectorHarness() {
  const [customer, setCustomer] = useState(window.segmentTest.customer);
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1>Ficha do cliente #{customer.CODIGO}</h1>
      <p data-testid="current-customer-segment">
        Segmento atual: {customer.SEGMENTO ?? "—"} · {customer.NOME ?? "—"}
      </p>
      <CustomerSegmentSelector
        customerId={customer.CODIGO}
        segmentId={customer.SEGMENTO}
        segmentName={customer.NOME}
        canEdit={!new URLSearchParams(location.search).has("readonly")}
        onSaved={(assignment) => {
          window.segmentTest.savedCallbacks += 1;
          setCustomer({
            CODIGO: assignment.CODIGO,
            SEGMENTO: assignment.SEGMENTO,
            NOME: assignment.segment.NOME,
          });
        }}
        onReload={async () => {
          window.segmentTest.reloads += 1;
          if (window.segmentTest.failReload) throw new Error("Failed read");
          setCustomer({ ...window.segmentTest.customer });
        }}
      />
      <button onClick={() => setCustomer({ CODIGO: 41, SEGMENTO: 1, NOME: "Atacado" })}>
        Abrir cliente 41
      </button>
    </div>
  );
}
document.documentElement.classList.toggle("dark", dark);
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={dark ? darkTheme : lightTheme}>
    <CssBaseline />
    <div style={{ height: "100dvh", overflow: "hidden" }}>
      {selector ? <SelectorHarness /> : <CustomerSegmentsPage />}
    </div>
  </ThemeProvider>,
);
