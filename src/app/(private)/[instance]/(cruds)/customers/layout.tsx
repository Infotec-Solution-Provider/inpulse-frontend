"use client"
import { ReactNode } from "react";
import CustomersProvider from "./customers-context";

interface CustomersLayoutProps {
    children: ReactNode;
}

export default function CustomersLayout({ children }: CustomersLayoutProps) {
    return (
        <CustomersProvider>
            {children}
        </CustomersProvider>
    );
}
