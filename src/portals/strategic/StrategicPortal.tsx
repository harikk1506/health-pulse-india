// src/portals/strategic/StrategicPortal.tsx

import { useState, useMemo, useContext, useEffect, useRef } from 'react';
import type { Portal } from '../../types';
import { StrategicContext } from '../../App';
import { CSSTransition } from 'react-transition-group';

import { PortalHeader } from './components/PortalHeader';
import { PortalFooter } from './components/PortalFooter';
import { StrategicSidebar } from './components/StrategicSidebar';
import { LoginPage } from './components/LoginPage';
import { LogoutScreen } from './components/LogoutScreen'; 
import { CriticalHospitalsModal } from './components/CriticalHospitalsModal';
import { Toast } from './components/Toast';

// Imported components necessary for rendering the dashboard view:
import { KpiMetric } from './components/KpiMetric';
import { RegionalHotspotsChart } from './components/RegionalHotspotsChart';
import { SystemHealthPanel } from './components/SystemHealthPanel';

const StrategicPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
    const { liveData, nationalHistory } = useContext(StrategicContext); 
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [ping, setPing] = useState(85);
    const [showCriticalModal, setShowCriticalModal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [toast, setToast] = useState<{message: string | null, type: string | null}>({ message: null, type: null });
    const modalRef = useRef(null);

    const showToast = (message: string, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: null, type: null }), 5000);
    };

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

    // **CORE LOGIC**: Calculate National and Regional Stats to display
    const nationalStats = useMemo(() => {
        if (liveData.length === 0) return null;
        const latestHistory = nationalHistory[nationalHistory.length - 1];

        const totalBeds = liveData.reduce((acc, h) => acc + h.totalBeds, 0);
        const occupiedBeds = liveData.reduce((acc, h) => acc + h.occupiedBeds, 0);
        
        const publicHospitals = liveData.filter(h => h.type.toLowerCase().includes('government'));
        const privateHospitals = liveData.filter(h => h.type.toLowerCase().includes('private') || h.type.toLowerCase().includes('trust'));

        const publicOccupancy = publicHospitals.reduce((acc, h) => acc + h.occupiedBeds, 0) / publicHospitals.reduce((acc, h) => acc + h.totalBeds, 1) * 100;
        const privateOccupancy = privateHospitals.reduce((acc, h) => acc + h.occupiedBeds, 0) / privateHospitals.reduce((acc, h) => acc + h.totalBeds, 1) * 100;

        return {
            totalOccupancy: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0,
            avgWaitTime: liveData.reduce((acc, h) => acc + h.currentWaitTime, 0) / liveData.length,
            avgFatigue: liveData.reduce((acc, h) => acc + h.staffFatigue_score, 0) / liveData.length,
            avgSatisfaction: liveData.reduce((acc, h) => acc + h.patientSatisfaction_pct, 0) / liveData.length,
            criticalCount: liveData.filter(h => h.bedOccupancy > 85).length,
            publicSectorOccupancy: publicOccupancy,
            privateSectorOccupancy: privateOccupancy,
            regionalOccupancy: latestHistory?.regionalOccupancy || {},
        };
    }, [liveData, nationalHistory]);
    
    const regionalStats = useMemo(() => {
        if (!nationalStats) return [];
        return Object.entries(nationalStats.regionalOccupancy).map(([region, avgOccupancy]) => ({
            region,
            avgOccupancy,
        }));
    }, [nationalStats]);


    const eligibleMciRegions = useMemo(() => {
        if (!nationalStats) return [];
        return Object.entries(nationalStats.regionalOccupancy)
            .filter(([, occupancy]) => occupancy > 85)
            .map(([region]) => region);
    }, [nationalStats]);
    
    // Display variable setup
    const isAnyZoneCritical = (nationalStats?.criticalCount || 0) > 0;
    const criticalHospitals = liveData.filter(h => h.bedOccupancy > 85);
    
    if (isLoggingOut) return <LogoutScreen />;
    if (!isAuthenticated) {
        return <LoginPage onLogin={() => setIsAuthenticated(true)} activePortal={activePortal} setActivePortal={setActivePortal} onGoToIntro={onGoToIntro} />;
    }

    if (!nationalStats) { 
        return <div className="flex h-screen items-center justify-center bg-slate-100"><i className="fas fa-spinner fa-spin text-4xl text-slate-800"></i><p className='ml-3 text-lg'>Processing Strategic Data...</p></div>; 
    }

    return (
        <div className="flex flex-col h-screen font-sans overflow-hidden bg-slate-100">
            <PortalHeader activePortal={activePortal} setActivePortal={setActivePortal} onLogout={handleLogout} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} onGoToIntro={onGoToIntro} />
            <div className="flex flex-grow overflow-hidden min-h-0">
                <StrategicSidebar isCollapsed={isSidebarCollapsed} lastUpdated={lastUpdated} />
                <main className="flex-grow flex flex-col p-3 overflow-y-auto gap-3">
                    {/* TOP-LEVEL METRICS */}
                    <div className='grid grid-cols-5 bg-white p-2 rounded-lg shadow-lg flex-shrink-0 border-t-4 border-slate-800'>
                        <KpiMetric 
                            title="National BOR" 
                            value={nationalStats.totalOccupancy.toFixed(1)} 
                            unit="%" 
                            color={nationalStats.totalOccupancy > 80 ? '#e53e3e' : nationalStats.totalOccupancy > 70 ? '#dd6b20' : '#3182ce'} 
                            icon={nationalStats.totalOccupancy > 80 ? FaExclamationTriangle : FaCheckCircle}
                            isAlert={nationalStats.totalOccupancy > 85}
                            trend="stable"
                        />
                         <KpiMetric 
                            title="Avg. Wait Time" 
                            value={nationalStats.avgWaitTime.toFixed(0)} 
                            unit=" min" 
                            color={nationalStats.avgWaitTime > 90 ? '#e53e3e' : nationalStats.avgWaitTime > 60 ? '#dd6b20' : '#38a169'} 
                            icon={FaClock}
                            isAlert={nationalStats.avgWaitTime > 120}
                            trend="stable"
                        />
                        <KpiMetric 
                            title="Staff Fatigue" 
                            value={nationalStats.avgFatigue.toFixed(1)} 
                            unit="%" 
                            color={nationalStats.avgFatigue > 70 ? '#e53e3e' : nationalStats.avgFatigue > 60 ? '#dd6b20' : '#3182ce'} 
                            icon={FaUserMd}
                            isAlert={nationalStats.avgFatigue > 75}
                            trend="up"
                        />
                        <KpiMetric 
                            title="Patient Experience" 
                            value={nationalStats.avgSatisfaction.toFixed(1)} 
                            unit="%" 
                            color={nationalStats.avgSatisfaction < 65 ? '#e53e3e' : nationalStats.avgSatisfaction < 80 ? '#dd6b20' : '#38a169'} 
                            icon={FaSmile}
                            isAlert={nationalStats.avgSatisfaction < 65}
                            trend="down"
                        />
                        <KpiMetric 
                            title="Critical Facilities" 
                            value={nationalStats.criticalCount.toString()}
                            unit="" 
                            color={isAnyZoneCritical ? '#e53e3e' : '#38a169'} 
                            icon={FaExclamationTriangle}
                            isAlert={isAnyZoneCritical}
                            onClick={() => setShowCriticalModal(true)}
                            trend="up"
                        />
                    </div>

                    {/* REGIONAL & SYSTEM HEALTH PANELS */}
                    <div className='grid grid-cols-3 gap-3 flex-grow'>
                        <div className='col-span-2'>
                           <RegionalHotspotsChart stats={regionalStats} />
                        </div>
                        <SystemHealthPanel stats={{ publicSectorOccupancy: nationalStats.publicSectorOccupancy, privateSectorOccupancy: nationalStats.privateSectorOccupancy }} />
                    </div>

                    {/* MCI DECLARATION PANEL */}
                    <div className='bg-white p-3 rounded-lg shadow-lg flex-shrink-0 border-t-4 border-red-500'>
                        <h2 className="text-base font-bold text-red-700 mb-2 flex items-center gap-2">Mass Casualty Incident (MCI) Protocol</h2>
                        <div className='flex gap-4 items-center'>
                            <p className='text-sm font-semibold'>Regional Alert Status:</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${eligibleMciRegions.length > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-green-500 text-white'}`}>
                                {eligibleMciRegions.length > 0 ? `HIGH STRESS IN ${eligibleMciRegions.join(', ')}` : 'ALL ZONES STABLE'}
                            </span>
                        </div>
                    </div>

                </main>
            </div>
            <PortalFooter ping={Math.round(ping)} />
            
             <CSSTransition nodeRef={modalRef} in={showCriticalModal} timeout={300} classNames="dropdown" unmountOnExit>
                 <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
                    <CriticalHospitalsModal onClose={() => setShowCriticalModal(false)} criticalHospitals={criticalHospitals} />
                 </div>
            </CSSTransition>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({message: null, type: null})} />
        </div>
    );
};

export default StrategicPortal;