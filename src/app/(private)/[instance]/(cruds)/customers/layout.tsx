import CustomersProvider from "./customers-context";

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <CustomersProvider>{children}</CustomersProvider>;
}
