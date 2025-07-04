"use client"
import { ReactNode } from "react";
import ContactsProvider from "./contacts-context";

interface ContactsLayoutProps {
    children: ReactNode;
}

export default function ContactsLayout({ children }: ContactsLayoutProps) {
    return (
        <ContactsProvider>
            {children}
        </ContactsProvider>
    );
}
