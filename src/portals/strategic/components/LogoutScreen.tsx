import { FaSpinner } from 'react-icons/fa';

export const LogoutScreen = () => (
    <div className="fixed inset-0 bg-slate-800 bg-opacity-90 flex flex-col items-center justify-center z-[200]">
        <FaSpinner className="animate-spin text-white text-4xl" />
        <p className="mt-4 text-white font-semibold">Logging out and clearing strategic session...</p>
    </div>
);