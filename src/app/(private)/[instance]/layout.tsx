"use client";
import Header from "@/app/(private)/[instance]/header";
import SocketProvider from "@/lib/contexts/socket.context";
import darkTheme from "@/lib/themes/dark";
import { ThemeProvider } from "@mui/material";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="box-border h-screen w-full overflow-hidden">
      <SocketProvider>
        <ThemeProvider theme={darkTheme}>
          <div className="grid h-screen w-full auto-rows-max grid-rows-[max-content_minmax(400px,1fr)]">
            <Header />
            {children}
          </div>
        </ThemeProvider>
      </SocketProvider>
    </div>
  );
}
