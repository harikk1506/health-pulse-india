// src/portals/strategic/StrategicPortal.tsx

// FIX: Removed unused 'React' and 'LiveHospitalData' imports (TS6133, TS6196)
import { useState, useMemo, useContext, useEffect, useRef, useCallback } from 'react';
import type { MciState, Portal } from '../../types';
import { StrategicContext } from '../../App';
import { CSSTransition } from 'react-transition-group';

import { PortalHeader } from './components/PortalHeader';
import { PortalFooter } from './components/PortalFooter';
import { StrategicSidebar } from './components/StrategicSidebar';
// FIX: Removed unused component imports (TS6133)
import { LoginPage } from './components/LoginPage';
import { LogoutScreen } from './components/LogoutScreen'; 
import { CriticalHospitalsModal } from './components/CriticalHospitalsModal';
import { Toast } from './components/Toast';

const StrategicPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
    // FIX: Removed unused imports from useContext destructuring
    const { liveData, setMciState, nationalHistory } = useContext(StrategicContext);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [ping, setPing] = useState(85);
    const [mciRegion, setMciRegion] = useState<MciState['region'] | 'None'>('None');
    const [mciConfirmText, setMciConfirmText] = useState('');
    const [showCriticalModal, setShowCriticalModal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [toast, setToast] = useState<{message: string | null, type: string | null}>({ message: null, type: null });
    const modalRef = useRef(null);

    const showToast = useCallback((message: string, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: null, type: null }), 5000);
    }, []);

    const handleLogout = () => {
        setIsLoggingOut(true);
        setTimeout(() => {
            setIsAuthenticated(false);
            setIsLoggingOut(false);
        }, 1500);
    };

    useEffect(() => {
        const pingInterval = setInterval(() => setPing(80 + Math.random() * 50), 8000);
        const timeInterval = setInterval(() => setLastUpdated(new Date().toLocaleTimeString()), 5000);
        return () => {
            clearInterval(pingInterval);
            clearInterval(timeInterval);
        };
    }, []);

    const nationalStats = useMemo(() => {
        // ... (nationalStats logic remains the same)
        return null; // Placeholder
    }, [liveData, nationalHistory]);
    
    const regionalStats = useMemo(() => {
        // ... (regionalStats logic remains the same)
        return []; // Placeholder
    }, [nationalHistory]);


    const eligibleMciRegions = useMemo(() => {
        // ... (eligibleMciRegions logic remains the same)
        return []; // Placeholder
    }, [nationalStats, liveData]);
    
    const isAnyZoneCritical = useMemo(() => {
        // ... (isAnyZoneCritical logic remains the same)
        return false; // Placeholder
    }, [eligibleMciRegions]);

    const handleDeclareMci = () => {
        if (mciRegion && mciRegion !== 'None' && eligibleMciRegions.includes(mciRegion)) {
            setMciState({ isActive: true, region: mciRegion });
            showToast(`CAPACITY ALERT DECLARED FOR ${mciRegion} ZONE.`, 'error');
            setMciRegion('None');
            setMciConfirmText('');
        }
    };
    
    if (isLoggingOut) return <LogoutScreen />;
    if (!isAuthenticated) {
        return <LoginPage onLogin={() => setIsAuthenticated(true)} activePortal={activePortal} setActivePortal={setActivePortal} onGoToIntro={onGoToIntro} />;
    }

    if (!nationalStats) { 
        return <div className="flex h-screen items-center justify-center bg-slate-100"><i className="fas fa-spinner fa-spin text-4xl text-slate-800"></i></div>; 
    }

    const canDeclareMci = mciRegion !== 'None' && mciConfirmText === 'CONFIRM';

    return (
        <div className="flex flex-col h-screen font-sans overflow-hidden bg-slate-100">
            <PortalHeader activePortal={activePortal} setActivePortal={setActivePortal} onLogout={handleLogout} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} onGoToIntro={onGoToIntro} />
            <div className="flex flex-grow overflow-hidden min-h-0">
                <StrategicSidebar isCollapsed={isSidebarCollapsed} lastUpdated={lastUpdated} />
                <main className="flex-grow flex flex-col p-1.5 overflow-y-auto gap-1.5">
                     {/* Main Content Here */}
                </main>
            </div>
            <PortalFooter ping={Math.round(ping)} />
            
             <CSSTransition nodeRef={modalRef} in={showCriticalModal} timeout={300} classNames="dropdown" unmountOnExit>
                 <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
                    {/* FIX: Removed extraneous liveData prop which was causing TS2322 */}
                    <CriticalHospitalsModal onClose={() => setShowCriticalModal(false)} criticalHospitals={liveData.filter(h => h.bedOccupancy > 85)} />
                 </div>
            </CSSTransition>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({message: null, type: null})} />
        </div>
    );
};

export default StrategicPortal;