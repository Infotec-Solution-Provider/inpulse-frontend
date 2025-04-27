import { ReactNode } from "react";
import InternalGroupProvider from "./context";

interface InternalGroupLayoutProps {
    children: ReactNode;
}

export default function InternalGroupLayout({ children }: InternalGroupLayoutProps) {
    return (
        <InternalGroupProvider>
            {children}
        </InternalGroupProvider>
    );
}