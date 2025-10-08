// src/portals/public/PublicPortal.tsx

import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import type { LiveHospitalData, Filters, SortKey, Portal } from '../../types';
import { useGeolocation, getDistance, useDebounce, calculateTheniETA, getMaxTransferDistance } from '../../utils/helpers_public';
import { FaStar, FaFilter, FaTimes, FaHeartbeat, FaSpinner, FaRedo, FaSort, FaPhone, FaDirections, FaMapMarkerAlt, FaSearch, FaAward, FaChevronDown, FaChevronUp, FaRoute, FaStethoscope, FaExclamationTriangle, FaHome } from 'react-icons/fa';
import { BiPlusMedical } from 'react-icons/bi';
import { GlobalContext, LanguageContext } from '../../App';
import { useTranslations } from '../../hooks/useTranslations';
import IndianLogo from '../../assets/logo.svg';
import { CSSTransition } from 'react-transition-group';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY; // SECURE: Key is now loaded from .env file

// Custom hook to handle clicks outside a component
const useOutsideClick = (ref: React.RefObject<HTMLDivElement>, callback: () => void) => {
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


// --- Header Component (Portal Dropdown Smooth Transition FIX) ---
function AppHeader({ activePortal, setActivePortal, onRecommendClick, onGoToIntro }: { activePortal: Portal; setActivePortal: (p: Portal) => void; onRecommendClick: () => void; onGoToIntro: () => void; }) {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const { language, setLanguage } = useContext(LanguageContext);
    const t = useTranslations();
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];
    const outerRef = useRef<HTMLDivElement>(null); // Ref for outside click detection
    const innerRef = useRef<HTMLDivElement>(null); // Ref for CSSTransition nodeRef/div

    // Use the outerRef for outside click detection
    useOutsideClick(outerRef, () => setDropdownOpen(false));

    return (
        <header className="bg-white shadow-md z-50 flex-shrink-0 sticky top-0">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <a href="/" className="flex items-center gap-3 cursor-pointer">
                    <img src={IndianLogo} alt="NATIONAL BED OCCUPANCY DASHBOARD Logo" className="h-10 w-10"/>
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
                            <div ref={innerRef} className="absolute right-0 top-12 bg-white p-4 rounded-lg shadow-xl border z-50 w-48 py-1">
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

// --- Filter Bar Component (Vertical Condensation & Filter Fix) ---
function FilterBar({ filters, setFilters, sortKey, setSortKey, sortDirection, setSortDirection }:
    { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>, sortKey: SortKey, setSortKey: (sk: SortKey) => void, sortDirection: 'asc' | 'desc', setSortDirection: (d: 'asc' | 'desc') => void }) {
    const t = useTranslations();
    const [isFilterOpen, setFilterOpen] = useState(false);
    const [isSortOpen, setSortOpen] = useState(false);
    const filterContainerRef = useRef<HTMLDivElement>(null);
    const sortContainerRef = useRef<HTMLDivElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useOutsideClick(filterContainerRef, () => setFilterOpen(false));
    useOutsideClick(sortContainerRef, () => setSortOpen(false));

    const handleClear = () => { setFilters({ searchTerm: '', types: [], hasICU: false, isOpen247: false, goodPPE: false }); setSortKey('distance'); setSortDirection('asc'); };
    const toggleType = (type: string) => setFilters(p => ({ ...p, types: p.types.includes(type) ? p.types.filter(t => t !== type) : [...p.types, type] }));

    const activeFilterCount = filters.types.length + (filters.hasICU ? 1 : 0) + (filters.isOpen247 ? 1 : 0) + (filters.goodPPE ? 1 : 0);
    
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const SortIcon = sortDirection === 'asc' ? FaChevronUp : FaChevronDown;
    
    return (
        <div className="p-2 bg-white border-b border-slate-200 flex-shrink-0 z-30 sticky top-0">
            <div className="flex items-center justify-between">
                <div ref={searchContainerRef} className={`relative flex items-center transition-shadow duration-300 rounded-lg shadow-md ring-2 ring-black`} style={{ width: '50%' }}>
                    <button className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-gray-500">
                        <FaSearch />
                    </button>
                    <input
                        type="text"
                        placeholder={t('public.search.placeholder')}
                        value={filters.searchTerm}
                        onChange={e => setFilters(p => ({ ...p, searchTerm: e.target.value }))}
                        className={`p-1.5 pl-10 border-none rounded-lg focus:ring-0 w-full`}
                    />
                    {filters.searchTerm && (
                        <button onClick={() => setFilters(p => ({...p, searchTerm: ''}))} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-800">
                            <FaTimes/>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div ref={filterContainerRef} className='relative z-40'>
                        <button onClick={() => setFilterOpen(p => !p)} className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 hover:bg-blue-100"> <FaFilter className='text-blue-600'/> {activeFilterCount > 0 && <span className='text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5'>{activeFilterCount}</span>} </button>
                        <CSSTransition nodeRef={filterContainerRef} in={isFilterOpen} timeout={200} classNames="dropdown" unmountOnExit>
                           <div className="absolute right-0 top-12 bg-white p-4 rounded-lg shadow-xl border z-40 w-72">
                                <h4 className='font-bold mb-2'>{t('filter.by')}</h4>
                                <div className='grid grid-cols-2 gap-2 text-sm'>
                                    <label className='flex items-center gap-2'><input type='checkbox' checked={filters.hasICU} onChange={() => setFilters(p => ({ ...p, hasICU: !p.hasICU }))}/>{t('filter.icu.available')}</label>
                                    <label className='flex items-center gap-2'><input type='checkbox' checked={filters.isOpen247} onChange={() => setFilters(p => ({ ...p, isOpen247: !p.isOpen247 }))}/>{t('filter.open.247')}</label>
                                    <label className='flex items-center gap-2'><input type='checkbox' checked={filters.goodPPE} onChange={() => setFilters(p => ({ ...p, goodPPE: !p.goodPPE }))}/>{t('filter.good.ppe')}</label>
                                </div>
                                <hr className='my-2'/>
                                <p className='font-semibold text-sm mb-1'>{t('filter.type.title')}</p>
                                <div className='flex gap-2'>
                                    <label className='flex-1 text-center p-2 border rounded-md has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500'><input type='checkbox' className='hidden' checked={filters.types.includes('Government')} onChange={() => toggleType('Government')}/>{t('filter.type.gov')}</label>
                                    <label className='flex-1 text-center p-2 border rounded-md has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500'><input type='checkbox' className='hidden' checked={filters.types.includes('Private')} onChange={() => toggleType('Private')}/>{t('filter.type.private')}</label>
                                </div>
                           </div>
                        </CSSTransition>
                    </div>
                     <div ref={sortContainerRef} className='relative z-40'>
                        <button onClick={() => setSortOpen(p => !p)} className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100"><FaSort className='text-blue-600'/></button>
                         <CSSTransition nodeRef={sortContainerRef} in={isSortOpen} timeout={200} classNames="dropdown" unmountOnExit>
                             <div className="absolute right-0 top-12 bg-white p-2 rounded-lg shadow-xl border z-40 w-56">
                                 <h4 className='font-bold p-2'>{t('sort.by')}</h4>
                                 <button onClick={() => handleSort('distance')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'distance' && 'bg-blue-100'}`}>{t('sort.distance')} {sortKey === 'distance' && <SortIcon size={12}/>}</button>
                                 <button onClick={() => handleSort('availableBeds')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'availableBeds' && 'bg-blue-100'}`}>{t('sort.beds')} {sortKey === 'availableBeds' && (sortDirection === 'desc' ? <FaChevronDown size={12}/> : <FaChevronUp size={12}/>)}</button>
                                 <button onClick={() => handleSort('availableICUBeds')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'availableICUBeds' && 'bg-blue-100'}`}>{t('sort.icu')} {sortKey === 'availableICUBeds' && (sortDirection === 'desc' ? <FaChevronDown size={12}/> : <FaChevronUp size={12}/>)}</button>
                                 <button onClick={() => handleSort('googleRating')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'googleRating' && 'bg-blue-100'}`}>{t('sort.rating')} {sortKey === 'googleRating' && (sortDirection === 'desc' ? <FaChevronDown size={12}/> : <FaChevronUp size={12}/>)}</button>
                                 <button onClick={() => handleSort('currentWaitTime')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'currentWaitTime' && 'bg-blue-100'}`}>{t('sort.wait.time')} {sortKey === 'currentWaitTime' && <SortIcon size={12}/>}</button>
                                 <button onClick={() => handleSort('minConsultCharge')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'minConsultCharge' && 'bg-blue-100'}`}>{t('sort.fee')} {sortKey === 'minConsultCharge' && <SortIcon size={12}/>}</button>
                             </div>
                         </CSSTransition>
                    </div>
                    <button onClick={handleClear} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><FaRedo className='text-red-500'/></button>
                </div>
            </div>
        </div>
    );
}

// --- List Item Component (Apply distance limit and fix text) ---
const HospitalListItem = ({ hospital, onSelect }: { hospital: LiveHospitalData; onSelect: () => void; }) => {
    const occupancyColor = hospital.bedOccupancy > 90 ? 'border-rose-500' : hospital.bedOccupancy > 75 ? 'border-amber-500' : 'border-emerald-500';
    const nameSize = hospital.name.length > 40 ? 'text-sm' : 'text-base';

    const typeText = hospital.type.split(' ')[0];
    let typeColor = 'bg-gray-100 text-gray-800';
    if (typeText.toLowerCase().includes('government')) { typeColor = 'bg-blue-100 text-blue-800'; }
    else if (typeText.toLowerCase().includes('private')) { typeColor = 'bg-green-100 text-green-800'; }
    else if (typeText.toLowerCase().includes('trust')) { typeColor = 'bg-purple-100 text-purple-800'; }

    return (
        <div onClick={onSelect} className={`bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 ${occupancyColor} overflow-hidden flex flex-col relative`}>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h3
                        className={`${nameSize} font-bold text-gray-800 pr-2 flex-1`}
                        title={hospital.name}
                    >
                        {hospital.name}
                    </h3>
                    <div className='text-right flex-shrink-0'>
                        <p className="font-bold text-lg text-blue-600">{hospital.distance ? `${hospital.distance.toFixed(1)} km` : 'N/A'}</p>
                        <p className={`text-xs font-bold mt-0.5 ${hospital.bedOccupancy > 90 ? 'text-rose-500' : 'text-gray-500'}`}>
                            Occ: {hospital.bedOccupancy.toFixed(1)}%
                        </p>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><FaStar className='text-yellow-500'/> {hospital.googleRating.toFixed(1)}</p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{typeText}</span>
                </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-around text-xs font-semibold">
                <span className='flex items-center gap-1 text-emerald-700'><BiPlusMedical/> {Math.floor(hospital.availableBeds)} Beds</span>
                <span className='flex items-center gap-1 text-rose-700'><FaHeartbeat/> {Math.floor(hospital.availableICUBeds)} ICU</span>
            </div>
        </div>
    );
};


// --- Hospital Detail Modal (Apply distance limit) ---
// --- Hospital Detail Modal (Apply distance limit) ---
const HospitalDetailView = ({ hospital, onBack }: { hospital: LiveHospitalData; onBack: () => void; }) => {
    const t = useTranslations();
    const { isHospitalBlocked } = useContext(GlobalContext);
    const isThisHospitalBlocked = hospital.id === 1 && isHospitalBlocked; // AIIMS Delhi (ID 1) check

    // RETRIEVE DATA
    const [lat, lng] = hospital.coords;

    // RESTORED MAP QUERY: Use the full Name and Address search string for pin/name display.
    const mapQuery = `${hospital.name}, ${hospital.address}`;

    // Map Embed URL: Uses the full name/address search.
    const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${encodeURIComponent(mapQuery)}`;

    // Directions URL: Use the explicit Name@Coordinates format for precise routing on click.
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${hospital.name}@${lat},${lng}`)}`;


    // STATIC ETA INTEGRATION: Now using the stabilized helper function (no trafficMultiplier argument)
    const eta = calculateTheniETA(hospital.distance || 0);
    const etaColor = eta > 20 ? 'text-red-500' : eta > 10 ? 'text-yellow-500' : 'text-green-500';

    // NEW LOGIC: Check distance limit
    const MAX_DIST = getMaxTransferDistance();
    const isTooFar = (hospital.distance || 0) > MAX_DIST;
    // FIX: Set ETA field to 'TOO FAR' (removing N/A) and keep the alert text minimal.
    const etaDisplay = isTooFar ? 'TOO FAR' : `${eta.toFixed(0)} min`;
    const etaColorDisplay = isTooFar ? 'text-gray-500' : etaColor;
    
    const [showContent, setShowContent] = useState(false);
    
    // Simulate "Estimating and Loading" delay for realism
    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 800); // 800ms delay
        return () => clearTimeout(timer);
    }, [hospital.id]);

    if (!showContent) {
        return (
            <div className="w-full max-w-sm h-72 bg-white rounded-xl shadow-2xl flex items-center justify-center p-8">
                <FaSpinner className="animate-spin text-blue-600" size={32} />
                <p className="text-gray-700 ml-3">Estimating Travel & Bed Status...</p>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 flex-grow space-y-3">
                
                {/* EMERGENCY BLOCKADE WARNING TWEAK */}
                {isThisHospitalBlocked && (
                    <div className="p-3 bg-red-100 border-l-4 border-red-500 rounded-lg text-red-700 font-bold flex items-center gap-2">
                        <FaExclamationTriangle size={18} />
                        <p>EMERGENCY DIVERSION: Facility temporarily not accepting routine patients.</p>
                    </div>
                )}
                
                <div className='flex justify-between items-start'>
                    <h2 className="text-xl font-bold text-gray-800 pr-2">{hospital.name}</h2>
                    <div className='flex gap-2 flex-shrink-0'>
                        <a href={`tel:${hospital.helpline}`} className='flex items-center justify-center h-8 w-8 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200' title="Call Helpline"><FaPhone/></a>
                        {/* Directions link opens external map with accurate pinning (Name@Coordinates) */}
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className='flex items-center justify-center h-8 w-8 bg-green-100 text-green-800 rounded-full hover:bg-green-200' title="Get Directions"><FaDirections/></a>
                    </div>
                </div>
                {/* RESTORED MAP IFRAME */}
                <div className="h-32 w-full relative flex-shrink-0 rounded-lg overflow-hidden border">
                    <iframe title={`Map of ${hospital.name}`} width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={mapSrc}></iframe>
                </div>
                
                 <p className="text-xs text-gray-500 -mt-2">{hospital.address}</p>

                <div className="grid grid-cols-2 gap-3 text-center">
                    {/* MODIFIED ETA DISPLAY */}
                    <div className='p-2 bg-slate-100 rounded-lg'>
                        <p className='text-xs text-gray-500 font-semibold'>Travel Time (ETA)</p>
                        <p className={`font-bold text-xl ${etaColorDisplay}`}>
                            {etaDisplay}
                        </p>
                        {/* Removed Max transfer distance exceeded. to avoid redundancy/size issues */}
                    </div>
                    <div className='p-2 bg-slate-100 rounded-lg'><p className='text-xs text-gray-500 font-semibold'>{t('beds.available')}</p><p className='font-bold text-xl text-emerald-600'>{Math.floor(hospital.availableBeds)}</p></div>
                    <div className='p-2 bg-slate-100 rounded-lg'><p className='text-xs text-gray-500 font-semibold'>{t('icu.available')}</p><p className='font-bold text-xl text-rose-600'>{Math.floor(hospital.availableICUBeds)}</p></div>
                    <div className='p-2 bg-slate-100 rounded-lg'><p className='text-xs text-gray-500 font-semibold'>Consulting Fee</p><p className='font-bold text-base'>₹{hospital.minConsultCharge}</p></div>
                </div>
                 <div className='flex items-center justify-center gap-2 text-sky-600 font-bold bg-sky-50 p-2 rounded-lg'><FaStethoscope/>{hospital.availableHours.includes("24x7") ? t('emergency.247') : 'Limited OPD Hours'}</div>
            </div>
            <div className='p-3 border-t bg-slate-50 flex-shrink-0'>
                <button onClick={onBack} className='w-full bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700'>Close</button>
            </div>
        </div>
    );
};

// --- Loading Screen Component (Restored) ---
const LoadingScreen = () => {
    const messages = ["Acquiring GPS Signal...", "Fetching Live Hospital Data...", "Calculating Routes..."];
    const [message, setMessage] = useState(messages[0]);

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % messages.length;
            setMessage(messages[i]);
        }, 1500);
        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div className="fixed inset-0 bg-slate-800 flex flex-col items-center justify-center z-50">
            <div className="gps-pulse">
                <FaMapMarkerAlt className="text-red-500 text-5xl"/>
            </div>
            <p className="mt-4 text-white font-semibold animate-pulse">{message}</p>
        </div>
    );
};

const RecommendationModal = ({ recommendations, onClose, onSelectHospital }: { recommendations: LiveHospitalData[], onClose: () => void, onSelectHospital: (h: LiveHospitalData) => void }) => {
    const t = useTranslations();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col">
            <div className="p-4 bg-blue-700 text-white border-b border-blue-800 flex justify-between items-center rounded-t-xl">
                <h2 className="text-xl font-bold flex items-center gap-2"><FaAward/> {t('recommend.title')}</h2>
                <button onClick={onClose}><FaTimes size={16} /></button>
            </div>
            {isLoading ? (
                <div className="p-4 space-y-3 flex flex-col items-center justify-center h-48">
                    <FaSpinner className="animate-spin text-blue-600" size={32} />
                    <p className="text-gray-600 font-semibold mt-2">Calculating best options...</p>
                </div>
            ) : (
                <div className='p-4 space-y-3'>
                    {recommendations.map((h, i) => (
                        <div key={h.id} onClick={() => onSelectHospital(h)} className="p-3 border rounded-lg hover:bg-gray-100 cursor-pointer">
                            <p className="font-bold text-lg">{i + 1}. {h.name}</p>
                            <div className="text-sm flex justify-between items-center mt-1">
                                <span>~{(h.eta ?? 0).toFixed(0)} min ETA</span> {/* Use the pre-calculated ETA from the memo */}
                                <span className="font-bold text-green-600">{Math.floor(h.availableBeds)} Beds</span>
                                <span className="font-bold text-rose-600">{Math.floor(h.availableICUBeds)} ICU</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const PortalFooterPublic = () => {
    const t = useTranslations();
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setLastUpdated(new Date()), 5000); // Update every 5 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <footer className="bg-gray-800 text-gray-400 text-[10px] p-1 text-center flex-shrink-0 flex justify-between items-center px-4"> {/* Reduced size to text-[10px] and padding to p-1 */}
            <span>© 2025 National Bed Occupancy Dashboard. V1.0.0 - {t('portal.public')} Gateway</span>
            <div className="flex items-center gap-4">
                <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
                <span>Session IP: 157.119.119.30</span>
            </div>
        </footer>
    );
};

// --- Main Component (Static ETA Integration) ---
const PublicPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
  // Pass 'public' to ensure a fixed starting location
  const { location: userLocation } = useGeolocation('public');
  const { liveData, mciState, isHospitalBlocked } = useContext(GlobalContext);
  const [selectedHospital, setSelectedHospital] = useState<LiveHospitalData | null>(null);
  const [filters, setFilters] = useState<Filters>({ searchTerm: '', types: [], hasICU: false, isOpen247: false, goodPPE: false });
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // ADDED state for direction
  const debouncedFilters = useDebounce(filters, 300);
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (liveData.length > 0) {
          setTimeout(() => setIsLoading(false), 2000);
      }
  }, [liveData]);

  const recommendations = useMemo(() => {
    if (!userLocation) return [];
    const scoredHospitals = liveData.map(h => {
        let score = 100;
        const distance = getDistance(userLocation[0], userLocation[1], h.coords[0], h.coords[1]);
        // STATIC ETA INTEGRATION: Calculate ETA using the now-static helper function (no second argument)
        const eta = calculateTheniETA(distance);

        if (h.id === 1 && isHospitalBlocked) score -= 500;
        if (mciState.isActive && h.region === mciState.region) score -= 300;
        score -= eta * 2;
        score -= h.bedOccupancy * 0.5;
        score -= h.staffFatigue_score * 0.3;
        if (h.availableBeds < 10) score -= 50;
        if (h.availableICUBeds < 2) score -= 50;
        
        return { ...h, distance, score, eta }; // Include ETA in the returned object
    });
    // Sort by calculated score (highest score first)
    return scoredHospitals.sort((a,b) => b.score - a.score).slice(0, 3);
  }, [liveData, userLocation, mciState, isHospitalBlocked]); // Removed trafficMultiplier from dependency array

  const processedData = useMemo(() => {
    if (liveData.length === 0) return [];
    let data = liveData.map(h => ({ ...h, distance: userLocation ? getDistance(userLocation[0], userLocation[1], h.coords[0], h.coords[1]) : undefined }));
    
    const searchTermLower = debouncedFilters.searchTerm.toLowerCase();
    if (debouncedFilters.searchTerm) { data = data.filter(h => h.name.toLowerCase().includes(searchTermLower) || h.state.toLowerCase().includes(searchTermLower) || h.address.toLowerCase().includes(searchTermLower) ); }
    if (debouncedFilters.types.length > 0) { data = data.filter(h => debouncedFilters.types.some(type => h.type.toLowerCase().includes(type.toLowerCase()))); }
    if (debouncedFilters.hasICU) { data = data.filter(h => h.availableICUBeds > 0); }
    if (debouncedFilters.isOpen247) { data = data.filter(h => h.availableHours.includes("24x7")); }
    if (debouncedFilters.goodPPE) { data = data.filter(h => h.ppe_stock_level === 'Good'); }

    // IMPLEMENTATION OF SORT DIRECTION
    data.sort((a, b) => {
        let comparisonValue = 0;

        switch(sortKey) {
            case 'distance': comparisonValue = (a.distance ?? Infinity) - (b.distance ?? Infinity); break;
            case 'availableBeds': comparisonValue = b.availableBeds - a.availableBeds; break;
            case 'availableICUBeds': comparisonValue = b.availableICUBeds - a.availableICUBeds; break;
            case 'googleRating': comparisonValue = b.googleRating - a.googleRating; break;
            case 'currentWaitTime': comparisonValue = a.currentWaitTime - b.currentWaitTime; break;
            case 'minConsultCharge': comparisonValue = a.minConsultCharge - b.minConsultCharge; break;
            default: comparisonValue = 0;
        }

        // Apply sort direction: flip result if descending
        return sortDirection === 'asc' ? comparisonValue : -comparisonValue;
    });
    return data;
  }, [liveData, userLocation, debouncedFilters, sortKey, sortDirection]); // ADDED sortDirection to dependencies
  
  const handleSelectFromRecommendation = (hospital: LiveHospitalData) => {
      setShowRecommendations(false);
      setSelectedHospital(hospital);
  };

  if (isLoading) {
      return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col h-screen font-sans bg-gradient-to-b from-orange-50 via-white to-green-50 text-slate-800">
      <AppHeader activePortal={activePortal} setActivePortal={setActivePortal} onRecommendClick={() => setShowRecommendations(true)} onGoToIntro={onGoToIntro} />
      
      {/* MCI REGIONAL ALERT TWEAK */}
      {mciState.isActive && (
        <div className="bg-red-500 text-white font-bold text-center py-1.5 text-sm animate-pulse">
            <FaExclamationTriangle className='inline mr-2'/>
            MAJOR CASUALTY INCIDENT ACTIVE in {mciState.region} region. Expect delays.
        </div>
      )}
      
      <div className="flex-grow overflow-hidden flex flex-col">
        {/* PASSED DIRECTION STATE TO FILTERBAR */}
        <FilterBar
            filters={filters}
            setFilters={setFilters}
            sortKey={sortKey}
            setSortKey={setSortKey}
            sortDirection={sortDirection}
            setSortDirection={setSortDirection}
        />
        <div className="flex-grow overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {processedData.slice(0, visibleCount).map((h) => <HospitalListItem key={h.id} hospital={h} onSelect={() => setSelectedHospital(h)} />)}
            </div>
            <div className="py-4 text-center">
                 {processedData.length > visibleCount && (
                     <button onClick={() => setVisibleCount(c => c + 8)} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 border border-blue-600 rounded shadow text-sm">
                         Load More
                     </button>
                 )}
                  {visibleCount > 8 && (
                     <button onClick={() => setVisibleCount(8)} className="text-blue-500 hover:text-blue-700 font-semibold text-xs py-1 px-3 ml-2">
                         Show Fewer
                     </button>
                 )}
            </div>
        </div>
        <PortalFooterPublic />
      </div>
      
      <CSSTransition nodeRef={modalRef} in={!!selectedHospital} timeout={300} classNames="dropdown" unmountOnExit>
         {/* FIX: Increased z-index from z-40 to z-[60] to ensure the modal covers the z-50 sticky header. */}
         <div ref={modalRef} className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
                {selectedHospital && <HospitalDetailView hospital={selectedHospital} onBack={() => setSelectedHospital(null)} />}
            </div>
         </div>
      </CSSTransition>

       <CSSTransition nodeRef={modalRef} in={showRecommendations} timeout={300} classNames="dropdown" unmountOnExit>
         <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <RecommendationModal recommendations={recommendations} onClose={() => setShowRecommendations(false)} onSelectHospital={handleSelectFromRecommendation} />
         </div>
      </CSSTransition>
    </div>
  );
}

export default PublicPortal;