import CustomersProvider from "../customers/customers-context";
import ContactsProvider from "./contacts-context";

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContactsProvider>
      <CustomersProvider>{children}</CustomersProvider>
    </ContactsProvider>
  );
}
