import ContactsProvider from "../(cruds)/contacts/contacts-context";
import CustomersProvider from "../(cruds)/customers/customers-context";
import ReadyMessagesProvider from "../(cruds)/ready-messages/ready-messages-context";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContactsProvider>
      <ReadyMessagesProvider>
        <CustomersProvider>{children}</CustomersProvider>
      </ReadyMessagesProvider>
    </ContactsProvider>
  );
}
