// src/portals/public/PublicPortal.tsx
import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import type { LiveHospitalData, Filters, SortKey, Portal } from '../../types';
import { useGeolocation, getDistance, useDebounce, calculateTheniETA } from '../../utils/helpers_public';
import { FaExclamationTriangle } from 'react-icons/fa';
import { GlobalContext } from '../../App';
import { CSSTransition } from 'react-transition-group';
import { AppHeader } from './components/AppHeader';
import { FilterBar } from './components/FilterBar';
import { HospitalDetailView } from './components/HospitalDetailView';
import { HospitalListItem } from './components/HospitalListItem';
import { LoadingScreen } from './components/LoadingScreen';
import { PortalFooterPublic } from './components/PortalFooterPublic';
import { RecommendationModal } from './components/RecommendationModal';

const PublicPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
  const { location: userLocation } = useGeolocation('public');
  const { liveData, mciState, isHospitalBlocked } = useContext(GlobalContext);
  const [selectedHospital, setSelectedHospital] = useState<LiveHospitalData | null>(null);
  const [filters, setFilters] = useState<Filters>({ searchTerm: '', types: [], hasICU: false, isOpen247: false, goodPPE: false });
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const debouncedFilters = useDebounce(filters, 300);
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const modalDetailRef = useRef<HTMLDivElement>(null);
  const modalRecRef = useRef<HTMLDivElement>(null); // New ref for Recommendation Modal

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
      
      {/* Hospital Detail View Modal (Existing Logic) */}
      <CSSTransition nodeRef={modalDetailRef} in={!!selectedHospital} timeout={300} classNames="dropdown" unmountOnExit>
         <div ref={modalDetailRef} className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
                {selectedHospital && <HospitalDetailView hospital={selectedHospital} onBack={() => setSelectedHospital(null)} />}
            </div>
         </div>
      </CSSTransition>
      
      {/* AI Recommendation Modal (FIXED to open in center) */}
      <CSSTransition nodeRef={modalRecRef} in={showRecommendations} timeout={300} classNames="dropdown" unmountOnExit>
          <div ref={modalRecRef} className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-70 p-4">
             {showRecommendations && <RecommendationModal recommendations={recommendations} onClose={() => setShowRecommendations(false)} onSelectHospital={handleSelectFromRecommendation} />}
          </div>
      </CSSTransition>
    </div>
  );
};

export default PublicPortal;