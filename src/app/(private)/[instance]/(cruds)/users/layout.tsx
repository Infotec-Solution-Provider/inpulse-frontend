import { ReactNode } from "react";
import UsersProvider from "./users-context";

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