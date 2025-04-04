type ModalHeaderProps = {
    onClose: () => void;
}

export const ModalHeader = ({ onClose }: ModalHeaderProps) => (
    <div className="flex max-w-full pt-0 px-4 pb-4 items-center justify-between">
        <p className="m-0 text-base">Cadastro de usuários</p>
        <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 p-2 rounded-full hover:bg-gray-500 transition-colors text-white text-base"
        >
            X
        </button>
    </div>
);