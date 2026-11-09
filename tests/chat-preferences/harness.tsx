import { createRoot } from "react-dom/client";
import { useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material";
import ChatsMenuItem from "../../src/app/(private)/[instance]/(main)/(chats-menu)/chats-menu-item";

// The real component and MUI portal run in Chromium; only service contexts and
// side effects are replaced, so an accidental open/read callback is observable.
function Harness() {
  const [selected, setSelected] = useState(new URLSearchParams(location.search).has("selected"));
  const [unread, setUnread] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const record = (event: string) => setEvents((previous) => [...previous, event]);
  return (
    <ThemeProvider theme={createTheme()}>
      <div style={{ width: 360 }}>
        <ChatsMenuItem
          name="Conversa de teste"
          message="Prévia"
          messageDate={new Date("2026-11-09T12:00:00Z")}
          tags={[]}
          isOpen={selected}
          isUnread={unread}
          isPinned={pinned}
          onToggleUnread={() => { record(unread ? "read-preference" : "unread-preference"); setUnread(!unread); }}
          onTogglePin={() => { record(pinned ? "unpin" : "pin"); setPinned(!pinned); }}
          onClick={() => { record("open/read"); setSelected(true); setUnread(false); }}
        />
      </div>
      <output data-testid="events">{JSON.stringify(events)}</output>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
