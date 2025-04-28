import { ReactNode } from "react";
import WalletsProvider from "./context";

interface WalletsLayoutProps {
    children: ReactNode;
}

export default function WalletsLayout({ children }: WalletsLayoutProps) {
    return (
        <WalletsProvider>
            {children}
        </WalletsProvider>
    );
}