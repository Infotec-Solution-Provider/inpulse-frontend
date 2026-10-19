import "../monitor/harness.css";
import { createRoot } from "react-dom/client";
import { useContext } from "react";
import AppLayout from "../../src/app/(private)/[instance]/layout";
import { ChatContext } from "../../src/app/(private)/[instance]/(main)/(chat)/chat-context";
import { useTelephony } from "../../src/lib/telephony/telephony-provider";
import { useEnvironment, state, resolveSend } from "../chat-send/doubles";
import { AuthContext } from "./doubles";
import { navigate, usePathname } from "../monitor/navigation-doubles";
navigate("/tenant-a/");
Object.assign(window, { shellFixture: { navigate, state, resolveSend } });
function Probe() {
  const chat = useContext(ChatContext),
    phone = useTelephony(),
    path = usePathname();
  return (
    <section>
      <h1>{path}</h1>
      <textarea
        aria-label="Message draft"
        value={chat.state.text}
        onChange={(e) => chat.dispatch({ type: "change-text", text: e.target.value })}
      />
      <button onClick={() => void chat.sendMessage()}>Send fixture</button>
      <button onClick={() => void phone.connect()}>Connect fixture</button>
      <button onClick={() => void phone.dial("102")}>Dial fixture</button>
      <output data-testid="phase">{phone.state.phase}</output>
      <output data-testid="connection">{phone.state.connection}</output>
      <output data-testid="pending">{chat.pendingSends.length}</output>
    </section>
  );
}
function Harness() {
  const env = useEnvironment();
  usePathname();
  return (
    <AuthContext.Provider
      value={
        {
          ...env.auth,
          user: { ...env.auth.user, NIVEL: "ADMIN", NOME: "Demo" },
          status: "authenticated",
          signOut: () => {},
        } as never
      }
    >
      <AppLayout>
        <Probe />
      </AppLayout>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
