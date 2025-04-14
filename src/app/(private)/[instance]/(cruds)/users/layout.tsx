import { ReactNode } from "react";
import UsersProvider from "./context";

interface UsersLayoutProps {
    children: ReactNode;
}

export default function UsersLayout({ children }: UsersLayoutProps) {
    return (
        <UsersProvider>
            {children}
        </UsersProvider>
    );
}