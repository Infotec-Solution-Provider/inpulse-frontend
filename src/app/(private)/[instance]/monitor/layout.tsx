"use client";

import { MonitorProvider } from "./context";
import ContactsProvider from "../(cruds)/contacts/contacts-context";
import CustomersProvider from "../(cruds)/customers/customers-context";
import ReadyMessagesProvider from "../(cruds)/ready-messages/ready-messages-context";

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ContactsProvider>
        <ReadyMessagesProvider>
          <CustomersProvider>
            <MonitorProvider>{children}</MonitorProvider>
          </CustomersProvider>
        </ReadyMessagesProvider>
      </ContactsProvider>
    </>
  );
}
