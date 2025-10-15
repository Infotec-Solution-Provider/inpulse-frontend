"use client";
import AppProvider from "@/app/(private)/[instance]/app-context";
import Header from "@/app/(private)/[instance]/header";
import SocketProvider from "@/app/(private)/[instance]/socket-context";
import { ThemeProvider } from "@/app/theme-context";
import { Modal } from "@mui/material";
import { ReactElement, ReactNode, useState } from "react";
import ContactsProvider from "./(cruds)/contacts/contacts-context";
import CustomersProvider from "./(cruds)/customers/customers-context";
import ReadyMessagesProvider from "./(cruds)/ready-messages/ready-messages-context";
import { InternalChatProvider } from "./internal-context";
import WhatsappProvider from "./whatsapp-context";
import InternalGroupsProvider from "./(cruds)/internal-groups/internal-groups-context";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [modal, setModal] = useState<ReactNode>(null);

  return (
    <div className="box-border h-auto w-full overflow-hidden md:h-screen md:w-screen">
      <AppProvider modal={modal} setModal={setModal}>
        <SocketProvider>
          <WhatsappProvider>
            <ContactsProvider>
              <InternalChatProvider>
                <InternalGroupsProvider>
                  <ReadyMessagesProvider>
                    <CustomersProvider>
                      <ThemeProvider>
                        <div className="grid h-auto w-full auto-rows-max grid-rows-[max-content_minmax(0,1fr)] md:h-screen md:w-screen md:grid-rows-[max-content_minmax(400px,1fr)]">
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
                    </CustomersProvider>
                  </ReadyMessagesProvider>
                </InternalGroupsProvider>
              </InternalChatProvider>
            </ContactsProvider>
          </WhatsappProvider>
        </SocketProvider>
      </AppProvider>
    </div>
  );
}
