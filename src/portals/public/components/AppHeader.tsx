import { useState, useRef, useContext, useEffect } from 'react';
import { FaChevronDown, FaHome, FaRoute } from 'react-icons/fa';
import { CSSTransition } from 'react-transition-group';
import { useTranslations } from '../../../hooks/useTranslations';
import { LanguageContext } from '../../../App';
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

export const AppHeader = ({ activePortal, setActivePortal, onRecommendClick, onGoToIntro }: { activePortal: Portal; setActivePortal: (p: Portal) => void; onRecommendClick: () => void; onGoToIntro: () => void; }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const { language, setLanguage } = useContext(LanguageContext);
    const t = useTranslations();
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useOutsideClick(outerRef, () => setDropdownOpen(false));

    return (
        <header className="bg-white shadow-md z-50 flex-shrink-0 sticky top-0">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <a href="/" className="flex items-center gap-3 cursor-pointer">
                    <img src={IndianLogo} alt="Logo" className="h-10 w-10"/>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t('public.header')}</h1>
                </a>
                <div className="flex items-center gap-4">
                     <button onClick={onGoToIntro} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors" title="Go to Intro Page">
                        <FaHome />
                    </button>
                    <button onClick={onRecommendClick} className="flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-purple-700 shadow-md smart-suggestion-button" title={t('recommend.button.title')}>
                        <FaRoute size={12} /> <span className='hidden sm:inline'>AI SmartRoute</span>
                    </button>
                    <button onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')} className="relative w-16 h-8 flex items-center bg-gray-200 rounded-full p-1 transition-colors duration-300 focus:outline-none" title={t('language.switcher.label')}>
                        <div className={`absolute left-1 transition-transform duration-300 transform ${language === 'hi' ? 'translate-x-8' : 'translate-x-0'} w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center`}>
                           <span className='font-bold text-xs text-blue-600'>{language === 'en' ? 'En' : 'हि'}</span>
                        </div>
                    </button>
                    <div ref={outerRef} className="flex items-center gap-2 relative z-50">
                        <button onClick={() => setDropdownOpen(p => !p)} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300">
                            {t(`portal.${activePortal.toLowerCase()}`)}
                            <FaChevronDown size={12} />
                        </button>
                        <CSSTransition nodeRef={innerRef} in={isDropdownOpen} timeout={200} classNames="dropdown" unmountOnExit>
                            <div ref={innerRef} className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border z-50 w-48 py-1">
                                <p className='text-xs font-semibold text-gray-500 px-3 py-1 border-b'>{t('switch.portal')}</p>
                                {portals.map(p => (
                                    <button key={p} onClick={() => { setActivePortal(p); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${activePortal === p ? 'bg-blue-500 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                                        {t(`portal.${p.toLowerCase()}`)}
                                    </button>
                                ))}
                            </div>
                        </CSSTransition>
                    </div>
                </div>
            </div>
        </header>
    );
}