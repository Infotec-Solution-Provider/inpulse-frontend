type ModalFooterProps = {
    onCancel: () => void;
    isFormValid: boolean;
}

export const ModalFooter = ({ onCancel, isFormValid }: ModalFooterProps) => (
    <div className="mt-4 mb-2 pt-2 border-t-2 border-indigo-900 flex justify-end gap-2">
        <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded hover:bg-gray-200 hover:text-slate-800 transition-colors text-white bg-slate-600"
        >
            Cancel
        </button>
        <button
            type="submit"
            disabled={!isFormValid}
            className={`px-4 py-2 rounded text-white transition-colors 
                ${isFormValid ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}
        >
            Save
        </button>
    </div>
);