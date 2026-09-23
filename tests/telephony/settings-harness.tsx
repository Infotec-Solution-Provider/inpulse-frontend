import { createRoot } from "react-dom/client";
import { WebrtcSettingsForm } from "../../src/lib/telephony/webrtc-settings-form";
import "./harness.css";
createRoot(document.getElementById("root")!).render(<main className="mx-auto max-w-4xl p-6"><WebrtcSettingsForm /></main>);
