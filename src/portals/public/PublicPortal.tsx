// src/portals/public/PublicPortal.tsx
import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import type { LiveHospitalData, Filters, Portal } from '../../types';
import { useGeolocation, getDistance, useDebounce, calculateTheniETA } from '../../utils/helpers_public';
import { FaExclamationTriangle } from 'react-icons/fa'; 
import { GlobalContext } from '../../App';
import { CSSTransition } from 'react-transition-group';
import { AppHeader } from './components/AppHeader';
import { FilterBar } from './components/FilterBar';
import { HospitalListItem } from './components/HospitalListItem';
import { LoadingScreen } from './components/LoadingScreen';
import { PortalFooterPublic } from './components/PortalFooterPublic';
import { RecommendationModal } from './components/RecommendationModal';
import { HospitalDetailView } from './components/HospitalDetailView';

const PublicPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
  const { location: userLocation } = useGeolocation('public');
  const { liveData, mciState } = useContext(GlobalContext);
  const [selectedHospital, setSelectedHospital] = useState<LiveHospitalData | null>(null);
  
  const [filters, setFilters] = useState<Filters>({ 
      searchTerm: '', types: [], hasICU: false, nearby: false, minRating: 0, 
      isOpen247: false, goodPPE: false 
  });
  
  const debouncedFilters = useDebounce(filters, 300);
  const [visibleCount, setVisibleCount] = useState(8);
  const [previousCount, setPreviousCount] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  // REFS
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPos = useRef(0); 
  const isRestoringScroll = useRef(false);

  const modalDetailRef = useRef<HTMLDivElement>(null);
  const modalRecRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (liveData.length > 0) setTimeout(() => setIsLoading(false), 2000);
  }, [liveData]);

  // --- MASTER RESET ACTION (Rewind Effect) ---
  const handleReset = () => {
      // 1. Scroll to Top smoothly first
      if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      // 2. Wait for scroll to finish (Rewind visual), then reset data
      setTimeout(() => {
          setFilters({ searchTerm: '', types: [], hasICU: false, nearby: false, minRating: 0, isOpen247: false, goodPPE: false });
          setVisibleCount(8);
          savedScrollPos.current = 0; 
      }, 500); 
  };

  // --- FILTER CHANGE LOGIC ---
  const handleFilterChange = (newFilters: Filters) => {
      const wasFilterActive = filters.searchTerm || filters.types.length > 0 || filters.hasICU || filters.nearby;
      const willFilterActive = newFilters.searchTerm || newFilters.types.length > 0 || newFilters.hasICU || newFilters.nearby;

      // Case A: Applying Filter (Save Spot)
      if (!wasFilterActive && willFilterActive) {
          if (scrollContainerRef.current) savedScrollPos.current = scrollContainerRef.current.scrollTop;
          setPreviousCount(visibleCount);
          setVisibleCount(8); 
      } 
      // Case B: Clearing Filter (Restore Spot)
      else if (wasFilterActive && !willFilterActive) {
          setVisibleCount(previousCount > 8 ? previousCount : 8);
          isRestoringScroll.current = true;
      }
      
      // Case C: Search Changed (Always Top)
      if (newFilters.searchTerm !== filters.searchTerm) {
          setVisibleCount(8);
          if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      }
      
      setFilters(newFilters);
  };

  // --- DATA PROCESSING (Moved UP so useEffect can see it) ---
  const processedData = useMemo(() => {
    if (liveData.length === 0) return [];
    let data = liveData.map(h => ({ 
        ...h, 
        distance: userLocation ? getDistance(userLocation[0], userLocation[1], h.coords[0], h.coords[1]) : 0 
    }));
    
    const term = debouncedFilters.searchTerm.toLowerCase();
    if (term) data = data.filter(h => h.name.toLowerCase().includes(term) || h.address.toLowerCase().includes(term));
    if (debouncedFilters.types.length > 0) data = data.filter(h => debouncedFilters.types.some(t => h.type.toLowerCase().includes(t.toLowerCase())));
    if (debouncedFilters.hasICU) data = data.filter(h => h.availableICUBeds > 0);
    if (debouncedFilters.nearby) data = data.filter(h => h.distance < 85);
    
    data.sort((a, b) => a.distance - b.distance);
    return data;
  }, [liveData, userLocation, debouncedFilters]); 

  const displayData = useMemo(() => {
      return processedData.map(sortedH => {
          const latest = liveData.find(liveH => liveH.id === sortedH.id);
          return latest ? { ...latest, distance: sortedH.distance } : sortedH;
      });
  }, [processedData, liveData]);

  // --- SCROLL RESTORE EFFECT (With Debounce Guard) ---
  useEffect(() => {
      if (isRestoringScroll.current && scrollContainerRef.current) {
          
          // CRITICAL FIX: Don't scroll until the Data (Debounced) matches the UI State (Filters)
          // If they differ, it means we are still in the 300ms waiting period, so we do nothing yet.
          if (JSON.stringify(filters) !== JSON.stringify(debouncedFilters)) {
              return; 
          }

          // Once matched, the list is fully expanded, so we can scroll safely.
          const timer = setTimeout(() => {
             if (scrollContainerRef.current) {
                 scrollContainerRef.current.scrollTo({ top: savedScrollPos.current, behavior: 'auto' });
             }
             isRestoringScroll.current = false;
          }, 50);
          return () => clearTimeout(timer);
      }
  }, [displayData.length, visibleCount, filters, debouncedFilters]); // Dependencies ensure this re-runs when debounce completes

  // --- RECOMMENDATIONS ---
  const recommendations = useMemo(() => {
    if (!userLocation || liveData.length === 0) return [];
    try {
        const scored = liveData.map(h => {
             const dist = getDistance(userLocation[0], userLocation[1], h.coords[0], h.coords[1]);
             return { ...h, distance: dist, score: 100 - dist, eta: calculateTheniETA(dist) };
        });
        return scored.sort((a,b) => b.score - a.score).slice(0, 3);
    } catch { return []; }
  }, [liveData, userLocation]);

  if (isLoading) { return <LoadingScreen />; }

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-50 text-slate-800">
      
      <AppHeader 
          onRecommendClick={() => setShowRecommendations(true)} 
          onGoToIntro={onGoToIntro}
          onReset={handleReset} 
      />
      
      {mciState.isActive && (
        <div className="bg-rose-600 text-white font-bold text-center py-1 text-xs animate-pulse z-30">
            <FaExclamationTriangle className='inline mr-2'/>
            MAJOR CASUALTY INCIDENT ACTIVE
        </div>
      )}
      
      <div className="flex-grow overflow-hidden flex flex-col relative">
        <FilterBar 
            filters={filters} 
            setFilters={handleFilterChange} 
            onReset={handleReset} 
        />
        
        <div 
            className="flex-grow overflow-y-auto p-4 scroll-smooth" 
            ref={scrollContainerRef}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto pb-2">
                {displayData.slice(0, visibleCount).map((h) => (
                    <div key={h.id} className="h-[160px]"> 
                        <HospitalListItem hospital={h} onSelect={() => setSelectedHospital(h)} />
                    </div>
                ))}
            </div>
            
            <div className="pt-1 pb-1 text-center flex justify-center items-center gap-2">
                 {displayData.length > visibleCount && (
                     <button onClick={() => setVisibleCount(c => c + 8)} className="bg-white text-blue-600 font-bold py-1.5 px-6 border border-blue-200 rounded-full shadow-sm hover:shadow-md hover:bg-blue-50 transition-all text-xs">
                         Load More
                     </button>
                 )}
            </div>
        </div>

        <PortalFooterPublic />
      </div>
      
      <CSSTransition nodeRef={modalDetailRef} in={!!selectedHospital} timeout={300} classNames="dropdown" unmountOnExit>
         <div ref={modalDetailRef} className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {selectedHospital && <HospitalDetailView hospital={selectedHospital} onBack={() => setSelectedHospital(null)} />}
            </div>
         </div>
      </CSSTransition>
      
      <CSSTransition nodeRef={modalRecRef} in={showRecommendations} timeout={300} classNames="dropdown" unmountOnExit>
          <div ref={modalRecRef} className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
             {showRecommendations && <RecommendationModal recommendations={recommendations} onClose={() => setShowRecommendations(false)} onSelectHospital={(h) => {setShowRecommendations(false); setSelectedHospital(h);}} />}
          </div>
      </CSSTransition>
    </div>
  );
};

export default PublicPortal;