"use client"
import { ReactNode } from "react";
import ReadyMessagesProvider from "./ready-messages-context";

interface ReadyMessagesLayoutProps {
  children: ReactNode;
}

export default function ReadyMessagesLayout({ children }: ReadyMessagesLayoutProps) {
  return <ReadyMessagesProvider>{children}</ReadyMessagesProvider>;
}
