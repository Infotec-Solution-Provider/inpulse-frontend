import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AuthProvider, { useAuthContext } from "../../src/app/auth-context";
import { authSession } from "../../src/lib/auth-session";
import { navigate, rejectRefresh, resolveRefresh, state } from "./doubles";

const harness = {
  state,
  mounts: 0,
  statuses: [] as string[],
  lastRefreshResult: "" as string,
  resolveRefresh,
  rejectRefresh,
  navigate,
  startRefresh() {
    this.lastRefreshResult = "pending";
    void authSession.forceRefresh().then(
      () => { this.lastRefreshResult = "resolved"; },
      () => { this.lastRefreshResult = "rejected"; },
    );
  },
};
declare global {
  interface Window { authHarness: typeof harness }
}
window.authHarness = harness;

function PrivateScreen() {
  const { status, token, isAuthenticated, pathname, signOut } = useAuthContext();
  const [draft, setDraft] = useState("");
  useEffect(() => { harness.mounts += 1; }, []);
  useEffect(() => { harness.statuses.push(status); }, [status]);
  return (
    <main>
      <output data-testid="status">{status}</output>
      <output data-testid="authenticated">{String(isAuthenticated)}</output>
      <output data-testid="token">{token ?? "none"}</output>
      <output data-testid="pathname">{pathname}</output>
      <input aria-label="Message draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button onClick={() => void signOut()}>Sign out</button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<AuthProvider><PrivateScreen /></AuthProvider>);
