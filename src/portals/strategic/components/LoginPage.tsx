import { useState } from 'react';
import { FaChevronDown, FaHome, FaSpinner, FaUserShield, FaGlobeAsia } from 'react-icons/fa';
import { useTranslations } from '../../../hooks/useTranslations';
import type { Portal } from '../../../types';
import { CSSTransition } from 'react-transition-group';

const PORTAL_TITLE = "RASHTRIYA NITI";
const PORTAL_USER_ID = "MoHFW-Admin";

export const LoginPage = ({ onLogin, activePortal, setActivePortal, onGoToIntro }: { onLogin: () => void, activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const t = useTranslations();
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];

    const handleLogin = () => {
        setIsLoading(true);
        setTimeout(() => {
            onLogin();
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans">
            <header className="bg-white p-4 shadow-sm border-b flex justify-between items-center flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3 font-display"><FaGlobeAsia className="text-slate-800" /> {PORTAL_TITLE}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={onGoToIntro} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors" title="Go to Intro Page">
                        <FaHome />
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setDropdownOpen(p => !p)} 
                            className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            {t(`portal.${activePortal.toLowerCase()}`)} <FaChevronDown size={12}/>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border z-50 w-48 py-1">
                                <p className='text-xs font-semibold text-gray-500 px-3 py-1 border-b'>{t('switch.portal')}</p>
                                {portals.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => { setActivePortal(p); setDropdownOpen(false); }}
                                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${activePortal === p ? 'bg-slate-800 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        {t(`portal.${p.toLowerCase()}`)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <div className="flex-grow flex items-center justify-center p-4">
                {isLoading ? (
                     <div className="text-center">
                        <FaSpinner className="animate-spin text-slate-800 text-4xl" />
                        <p className="mt-2 font-semibold text-gray-600">Authenticating and loading national data...</p>
                    </div>
                ) : (
                    <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border-t-8 border-slate-800 p-6 space-y-4">
                        <div className="text-center">
                            <FaUserShield size={40} className="text-slate-800 mx-auto mb-2" />
                            <h2 className="text-xl font-bold text-gray-800">Welcome, Director</h2>
                            <p className="text-sm text-gray-500">Strategic Command Terminal</p>
                        </div>
                        <input type="text" placeholder="User ID" defaultValue={PORTAL_USER_ID} className="w-full p-3 border rounded-lg bg-gray-100" readOnly />
                        <input placeholder="Password" defaultValue="password123" className="w-full p-3 border rounded-lg" type="password" />
                        <button onClick={handleLogin} className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900">
                            Authenticate
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};