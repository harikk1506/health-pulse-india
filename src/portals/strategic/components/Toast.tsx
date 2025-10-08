import { FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export const Toast = ({ message, type, onClose }: { message: string | null, type: string | null, onClose: () => void }) => {
    if (!message) return null;
    const colorClass = type === 'success' ? "bg-green-600" : "bg-red-600";
    const Icon = type === 'success' ? FaCheckCircle : FaExclamationTriangle;
    return (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-2xl z-[100] flex items-center gap-3 font-semibold text-white ${colorClass}`}>
            <Icon size={20} />
            {message}
            <button onClick={onClose} className="ml-4 opacity-75 hover:opacity-100">
                <FaTimes size={12} />
            </button>
        </div>
    );
};