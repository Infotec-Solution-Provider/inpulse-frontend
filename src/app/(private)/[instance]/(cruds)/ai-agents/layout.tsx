import { ReactNode } from "react";
import AiAgentsProvider from "./ai-agents-context";

export default function AiAgentsLayout({ children }: { children: ReactNode }) {
  return <AiAgentsProvider>{children}</AiAgentsProvider>;
}
