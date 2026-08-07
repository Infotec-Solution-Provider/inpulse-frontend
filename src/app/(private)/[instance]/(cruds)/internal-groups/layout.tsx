import InternalGroupsProvider from "./internal-groups-context";

export default function InternalGroupsLayout({ children }: { children: React.ReactNode }) {
  return <InternalGroupsProvider>{children}</InternalGroupsProvider>;
}
