"use client";
import { useAuthContext } from "@/app/auth-context";
import { ReactNode } from "react";
import UsersProvider from "./users-context";

interface UsersLayoutProps {
  children: ReactNode;
}

export default function UsersLayout({ children }: UsersLayoutProps) {
  const { instance, user } = useAuthContext();
  return <UsersProvider key={`${instance}:${user?.CODIGO}`}>{children}</UsersProvider>;
}
