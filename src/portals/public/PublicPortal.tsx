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

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

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
    { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>, sortKey: SortKey, setSortKey: (sk: SortKey) => void, sortDirection: 'asc' | 'desc', setSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>> }) {
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

// Other components (ListItem, DetailView, etc.) remain the same

// --- MAIN PORTAL COMPONENT ---
const PublicPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
  // Pass 'public' to ensure a fixed starting location
  const { location: userLocation } = useGeolocation('public', undefined, undefined, false, 0);
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
        const eta = calculateTheniETA(distance);

        if (h.id === 1 && isHospitalBlocked) score -= 500;
        if (mciState.isActive && h.region === mciState.region) score -= 300;
        score -= eta * 2;
        score -= h.bedOccupancy * 0.5;
        score -= h.staffFatigue_score * 0.3;
        if (h.availableBeds < 10) score -= 50;
        if (h.availableICUBeds < 2) score -= 50;
        
        return { ...h, distance, score, eta };
    });
    return scoredHospitals.sort((a,b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3);
  }, [liveData, userLocation, mciState, isHospitalBlocked]);

  const processedData = useMemo(() => {
    if (liveData.length === 0) return [];
    let data = liveData.map(h => ({ ...h, distance: userLocation ? getDistance(userLocation[0], userLocation[1], h.coords[0], h.coords[1]) : undefined }));
    
    const searchTermLower = debouncedFilters.searchTerm.toLowerCase();
    if (debouncedFilters.searchTerm) { data = data.filter(h => h.name.toLowerCase().includes(searchTermLower) || h.state.toLowerCase().includes(searchTermLower) || h.address.toLowerCase().includes(searchTermLower) ); }
    if (debouncedFilters.types.length > 0) { data = data.filter(h => debouncedFilters.types.some(type => h.type.toLowerCase().includes(type.toLowerCase()))); }
    if (debouncedFilters.hasICU) { data = data.filter(h => h.availableICUBeds > 0); }
    if (debouncedFilters.isOpen247) { data = data.filter(h => h.availableHours.includes("24x7")); }
    if (debouncedFilters.goodPPE) { data = data.filter(h => h.ppe_stock_level === 'Good'); }

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
        return sortDirection === 'asc' ? comparisonValue : -comparisonValue;
    });
    return data;
  }, [liveData, userLocation, debouncedFilters, sortKey, sortDirection]);
  
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
      
      {mciState.isActive && (
        <div className="bg-red-500 text-white font-bold text-center py-1.5 text-sm animate-pulse">
            <FaExclamationTriangle className='inline mr-2'/>
            MAJOR CASUALTY INCIDENT ACTIVE in {mciState.region} region. Expect delays.
        </div>
      )}
      
      <div className="flex-grow overflow-hidden flex flex-col">
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