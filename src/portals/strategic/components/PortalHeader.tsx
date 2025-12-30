import { useState, useRef, useEffect } from 'react';
import { FaBars, FaChevronDown, FaHome, FaSignOutAlt } from 'react-icons/fa';
import { CSSTransition } from 'react-transition-group';
import { useTranslations } from '../../../hooks/useTranslations';
import type { Portal } from '../../../types';
import IndianLogo from '../../../assets/logo.svg';

// FIX: Update type signature to allow null for useRef(null) initialization
const useOutsideClick = (ref: React.RefObject<HTMLDivElement | null>, callback: () => void) => {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, callback]);
};

export const PortalHeader = ({ activePortal, setActivePortal, onLogout, isSidebarCollapsed, setIsSidebarCollapsed, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onLogout: () => void, isSidebarCollapsed: boolean, setIsSidebarCollapsed: (c: boolean) => void, onGoToIntro: () => void }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const t = useTranslations();
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useOutsideClick(outerRef, () => setDropdownOpen(false));

    return (
        <header className="bg-white p-1 shadow-sm flex items-center justify-between flex-shrink-0 border-b-4 border-slate-800 z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 rounded hover:bg-gray-100 text-gray-700" title={isSidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}>
                    <FaBars size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <img src={IndianLogo} alt="Indian Logo" className="h-9 w-9"/>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 font-display">
                        <span className="hidden md:block">RASHTRIYA NITI</span>
                        <span className="md:hidden">NITI</span>
                    </h1>
                </div>
            </div>
            
            <div className="flex items-center gap-4 relative">
                 <button onClick={onGoToIntro} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors" title="Go to Intro Page">
                    <FaHome />
                </button>
                <div ref={outerRef} className="relative">
                    <button 
                        onClick={() => setDropdownOpen(p => !p)} 
                        className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        <span className="hidden md:inline">{t(`portal.${activePortal.toLowerCase()}`)}</span> <FaChevronDown size={12} />
                    </button>
                    <CSSTransition nodeRef={innerRef} in={isDropdownOpen} timeout={200} classNames="dropdown" unmountOnExit>
                        <div ref={innerRef} className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border z-50 w-48 py-1">
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
                    </CSSTransition>
                </div>
                 <button onClick={onLogout} className="bg-red-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <FaSignOutAlt />
                </button>
            </div>
        </header>
    );
};