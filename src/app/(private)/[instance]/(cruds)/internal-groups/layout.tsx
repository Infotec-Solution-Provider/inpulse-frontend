"use client"
import { ReactNode } from "react";
import InternalGroupsProvider from "./internal-groups-context";

interface InternalGroupsLayoutProps {
  children: ReactNode;
}

export default function InternalGroupsLayout({ children }: InternalGroupsLayoutProps) {
  return <InternalGroupsProvider>{children}</InternalGroupsProvider>;
}
