import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import GoalAssignments from "../../src/lib/components/goal-assignments";
function Harness() {
  const [tenant, setTenant] = useState("tenant-a");
  return (
    <ThemeProvider theme={createTheme()}>
      <CssBaseline />
      <main style={{ maxWidth: 880, margin: "auto", padding: 16 }}>
        <h1>Atribuir metas</h1>
        <button onClick={() => setTenant("tenant-b")}>Trocar tenant</button>
        <GoalAssignments key={tenant} token="fixture" instance={tenant} onSaved={() => {}} />
      </main>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
