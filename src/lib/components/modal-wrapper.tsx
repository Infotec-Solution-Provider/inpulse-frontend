import { ReactNode } from "react";

export default function ModalWrapper({ children }: { children: ReactNode }) {
    return (
        <dialog
            className="absolute w-screen h-full z-30 top-0 bottom-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center"
        >
            {children}
        </dialog>
    )
}