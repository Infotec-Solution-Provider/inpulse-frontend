import { ReactNode } from "react";

type ModalProps = {
    isOpen: boolean;
    children: ReactNode;
}

export const Modal = ({ isOpen, children }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed z-30 top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
            <div className="flex flex-col gap-1 bg-slate-800 p-8 rounded-lg relative w-[400px]">
                {children}
            </div>
        </div>
    );
};