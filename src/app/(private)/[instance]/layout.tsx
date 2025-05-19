"use client";
import Header from "@/app/(private)/[instance]/header";
import AppProvider from "@/app/(private)/[instance]/app-context";
import SocketProvider from "@/app/(private)/[instance]/socket-context";
import darkTheme from "@/lib/themes/dark";
import { Modal, ThemeProvider } from "@mui/material";
import { ReactElement, ReactNode, useState } from "react";
import WhatsappProvider from "./whatsapp-context";
import { InternalChatProvider } from "./internal-context";
import UsersProvider from "./(cruds)/users/users-context";
import UsersProviders from "./(cruds)/users/context";
import ReadyMessagesProvider from "./(cruds)/ready-messages/ready-messages-context";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [modal, setModal] = useState<ReactNode>(null);

  return (
    <div className="box-border h-screen w-full overflow-hidden">
      <AppProvider modal={modal} setModal={setModal}>
        <SocketProvider>
        <UsersProviders>

          <WhatsappProvider>
            <UsersProvider>
              <InternalChatProvider>
              <ReadyMessagesProvider>

                <ThemeProvider theme={darkTheme}>
                  <div className="grid h-screen w-full auto-rows-max grid-rows-[max-content_minmax(400px,1fr)]">
                    <Header />
                    {children}
                    <Modal
                      open={!!modal}
                      onClose={(_, r) => {
                        if (r === "backdropClick") return;
                        setModal(null);
                      }}
                      className="flex items-center justify-center"
                    >
                      <div>{modal as ReactElement}</div>
                    </Modal>
                  </div>
                </ThemeProvider>
                </ReadyMessagesProvider>

              </InternalChatProvider>
            </UsersProvider>
          </WhatsappProvider>
          </UsersProviders>
        </SocketProvider>
      </AppProvider>
    </div>
  );
}
