// src/portals/strategic/StrategicPortal.tsx

import React, { useState, useMemo, useContext, useEffect, useRef, useCallback } from 'react';
import type { MciState, Portal, LiveHospitalData } from '../../types';
import { StrategicContext } from '../../App';
import { useTranslations } from '../../hooks/useTranslations';
import { FaGlobeAsia, FaExclamationTriangle, FaSpinner, FaBed, FaSignOutAlt, FaUserShield, FaBars, FaSitemap, FaTimes, FaBiohazard, FaHeartbeat, FaArrowUp, FaArrowDown, FaChevronDown, FaSmile, FaUserMd, FaShieldAlt, FaProcedures, FaMapMarkedAlt, FaTasks, FaClock, FaCheckCircle, FaHome, FaInfoCircle } from 'react-icons/fa';
import { IconType } from 'react-icons';
import IndianLogo from '../../assets/logo.svg';
import { CSSTransition } from 'react-transition-group';


// --- PORTAL CONFIGURATION ---
const PORTAL_TITLE = "RASHTRIYA NITI";
const PORTAL_USER_TITLE = "Director";
const PORTAL_USER_ID = "MoHFW-Admin";

// --- METRIC COLORS (Refined Palette) ---
const COLORS = {
    alertRed: '#e53e3e',
    warningOrange: '#dd6b20',
    safeGreen: '#38a169',
    primaryBlue: '#3182ce',
    staffFatigue: '#d69e2e', // Gold/Amber for Staff
    patientSatisfaction: '#805ad5', // Purple for Satisfaction
    publicSector: '#06b6d4',
    privateSector: '#6366f1',
    textDark: '#2d3748',
    textMedium: '#4a5568',
    textLight: '#718096',
};


// --- REUSABLE & STANDARDIZED COMPONENTS ---

const Toast = ({ message, type, onClose }: { message: string | null, type: string | null, onClose: () => void }) => {
    if (!message) return null;
    const colorClass = type === 'success' ? "bg-green-600" : "bg-red-600";
    const Icon = type === 'success' ? FaCheckCircle : FaExclamationTriangle;
    return (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-2xl z-[100] flex items-center gap-3 font-semibold text-white ${colorClass}`}>
            <Icon size={20} />
            {message}
            <button onClick={onClose} className="ml-4 opacity-75 hover:opacity-100">
                <FaTimes size={12} />
            </button>
        </div>
    );
};

const PortalHeader = ({ activePortal, setActivePortal, onLogout, isSidebarCollapsed, setIsSidebarCollapsed, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onLogout: () => void, isSidebarCollapsed: boolean, setIsSidebarCollapsed: (c: boolean) => void, onGoToIntro: () => void }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const t = useTranslations();
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];

    return (
        <header className="bg-white p-1 shadow-sm flex items-center justify-between flex-shrink-0 border-b-4 border-slate-800 z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 rounded hover:bg-gray-100 text-gray-700" title={isSidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}>
                    <FaBars size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <img src={IndianLogo} alt="Indian Logo" className="h-9 w-9"/>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 font-display">
                        {PORTAL_TITLE}
                    </h1>
                </div>
            </div>
            
            <div className="flex items-center gap-4 relative">
                 <button onClick={onGoToIntro} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors" title="Go to Intro Page">
                    <FaHome />
                </button>
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(p => !p)}
                        className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        {t(`portal.${activePortal.toLowerCase()}`)} <FaChevronDown size={12} />
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
                 <button onClick={onLogout} className="bg-red-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <FaSignOutAlt />
                </button>
            </div>
        </header>
    );
};

const PortalFooter = ({ ping }: { ping: number }) => (
    <footer className="bg-gray-800 text-gray-400 text-[9px] p-0.5 text-center flex-shrink-0 flex justify-between items-center px-4 z-20">
        <span>© 2025 National Bed Occupancy Dashboard. V1.0.0 - {PORTAL_TITLE}</span>
        <div className="flex items-center gap-4">
            <span className={`${ping > 500 ? 'text-red-400 animate-pulse' : 'text-green-400'} font-semibold`}>Ping: {ping} ms</span>
            <span>Session IP: 103.48.198.141</span>
        </div>
    </footer>
);

// Other components remain the same

// --- MAIN STRATEGIC PORTAL COMPONENT ---

const StrategicPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
    const { liveData, mciState, setMciState, nationalHistory } = useContext(StrategicContext);
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
    const t = useTranslations();

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
        if (liveData.length === 0 || nationalHistory.length < 2) return null;
        
        const latest = nationalHistory[nationalHistory.length - 1];
        const previous = nationalHistory[nationalHistory.length - 2];

        const getTrend = (current: number, prev: number) => {
            if (current > prev) return 'up';
            if (current < prev) return 'down';
            return 'stable';
        };

        const criticalHospitals = liveData.filter(h => h.bedOccupancy > 85);
        const criticalHospitalPercent = (criticalHospitals.length / liveData.length) * 100;
        const prevCriticalHospitalsPercent = (previous.criticalHospitals / liveData.length) * 100;
        
        const resourceStrainedHospitals = liveData.filter(h => h.oxygen_supply_days < 10 || h.ppe_stock_level === 'Critical' || h.ppe_stock_level === 'Stockout');
        
        return {
            avgOccupancy: latest.avgOccupancy,
            trend_bor: getTrend(latest.avgOccupancy, previous.avgOccupancy),
            
            criticalHospitalPercent: criticalHospitalPercent,
            trend_critical: getTrend(criticalHospitalPercent, prevCriticalHospitalsPercent),
            
            avgALOS: liveData.reduce((acc, h) => acc + h.ALOS_days, 0) / liveData.length,
            trend_alos: 'stable',
            
            adequateResourcePercent: (1 - (resourceStrainedHospitals.length / liveData.length)) * 100,
            trend_resources: 'stable',
            
            avgStaffFatigue: latest.avgStaffFatigue,
            trend_fatigue: getTrend(latest.avgStaffFatigue, previous.avgStaffFatigue),

            avgSatisfaction: latest.avgSatisfaction,
            trend_satisfaction: getTrend(latest.avgSatisfaction, previous.avgSatisfaction),
            
            publicSectorOccupancy: latest.regionalOccupancy ? Object.values(latest.regionalOccupancy).reduce((a,b) => a+b, 0) / Object.keys(latest.regionalOccupancy).length : 0,
            privateSectorOccupancy: (latest.avgOccupancy * 1.1) - 10,
        };
    }, [liveData, nationalHistory]);
    
    const regionalStats = useMemo(() => {
        if (nationalHistory.length === 0) return [];
        const latestHistoryEntry = nationalHistory[nationalHistory.length - 1];
        if (!latestHistoryEntry || !latestHistoryEntry.regionalOccupancy) return [];
        
        const orderedRegions = ['North', 'West', 'Central', 'East', 'South'];
        return orderedRegions.map(region => ({
            region,
            avgOccupancy: latestHistoryEntry.regionalOccupancy[region] || 0
        }));
    }, [nationalHistory]);


    const eligibleMciRegions = useMemo(() => {
        if(!nationalStats) return [];
        const regions: Record<string, number> = { North: 27, South: 41, East: 24, West: 29, Central: 29 };
        const criticalCounts: Record<string, number> = { North: 0, South: 0, East: 0, West: 0, Central: 0 };
        const criticalHospitals = liveData.filter(h => h.bedOccupancy > 85);
        criticalHospitals.forEach(h => {
            if (criticalCounts[h.region] !== undefined) criticalCounts[h.region]++;
        });
        
        return (Object.keys(regions) as (keyof typeof regions)[]).filter(regionName => {
            const percentage = (criticalCounts[regionName] / regions[regionName]) * 100;
            return percentage >= 90;
        });
    }, [nationalStats, liveData]);
    
    const isAnyZoneCritical = useMemo(() => {
        if (!eligibleMciRegions) return false;
        return eligibleMciRegions.length > 0;
    }, [eligibleMciRegions]);

    const handleDeclareMci = () => {
        if (mciRegion && mciRegion !== 'None' && eligibleMciRegions.includes(mciRegion)) {
            setMciState({ isActive: true, region: mciRegion });
            showToast(`CAPACITY ALERT DECLARED: Coordinated response protocols are now active for the ${mciRegion} zone.`, 'error');
            setMciRegion('None');
            setMciConfirmText('');
        }
    };
    
    if (isLoggingOut) return <LogoutScreen />;
    if (!isAuthenticated) {
        return <LoginPage onLogin={() => setIsAuthenticated(true)} t={t} activePortal={activePortal} setActivePortal={setActivePortal} onGoToIntro={onGoToIntro} />;
    }

    if (!nationalStats) { 
        return <div className="flex h-screen items-center justify-center bg-slate-100"><FaSpinner className="animate-spin text-slate-800" size={48} /></div>; 
    }

    const canDeclareMci = mciRegion !== 'None' && mciConfirmText === 'CONFIRM';

    return (
        <div className="flex flex-col h-screen font-sans overflow-hidden bg-slate-100">
            <PortalHeader activePortal={activePortal} setActivePortal={setActivePortal} onLogout={handleLogout} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} onGoToIntro={onGoToIntro} />
            <div className="flex flex-grow overflow-hidden min-h-0">
                <StrategicSidebar isCollapsed={isSidebarCollapsed} lastUpdated={lastUpdated} />
                <main className="flex-grow flex flex-col p-1.5 overflow-y-auto gap-1.5">
                     <div className="max-w-7xl w-full mx-auto flex flex-col gap-1.5 h-full">
                        <div className="bg-white rounded-lg shadow-md border border-slate-200 grid grid-cols-6 divide-x divide-slate-200 py-2">
                           <KpiMetric title="National BOR" value={`${nationalStats.avgOccupancy.toFixed(1)}`} unit="%" color={COLORS.primaryBlue} icon={FaBed} isAlert={nationalStats.avgOccupancy > 85} trend={nationalStats.trend_bor} />
                           <KpiMetric title="Hospitals >85% BOR" value={`${nationalStats.criticalHospitalPercent.toFixed(1)}`} unit="%" color={COLORS.alertRed} icon={FaHeartbeat} isAlert={nationalStats.criticalHospitalPercent > 18 || isAnyZoneCritical} onClick={() => setShowCriticalModal(true)} trend={nationalStats.trend_critical} />
                           <KpiMetric title="Avg. Length of Stay" value={`${nationalStats.avgALOS.toFixed(1)}`} unit=" days" color={COLORS.safeGreen} icon={FaProcedures} isAlert={nationalStats.avgALOS > 6} trend={nationalStats.trend_alos} />
                           <KpiMetric title="Adequate Resources" value={`${nationalStats.adequateResourcePercent.toFixed(1)}`} unit="%" color={COLORS.warningOrange} icon={FaBiohazard} isAlert={nationalStats.adequateResourcePercent < 25} trend={nationalStats.trend_resources} />
                           <KpiMetric title="Staff Duty Load" value={nationalStats.avgStaffFatigue.toFixed(1)} unit="%" icon={FaUserMd} color={COLORS.staffFatigue} isAlert={nationalStats.avgStaffFatigue > 70} trend={nationalStats.trend_fatigue}/>
                           <KpiMetric title="Patient Experience" value={nationalStats.avgSatisfaction.toFixed(1)} unit="%" icon={FaSmile} color={COLORS.patientSatisfaction} isAlert={nationalStats.avgSatisfaction < 65} trend={nationalStats.trend_satisfaction}/>
                        </div>

                        <div className="flex-grow grid grid-cols-12 gap-1.5">
                            <div className="col-span-7">
                                <RegionalHotspotsChart stats={regionalStats} />
                            </div>
                            <div className="col-span-5 flex flex-col gap-1.5">
                                <SystemHealthPanel stats={nationalStats} />
                                <div className="bg-white p-3 rounded-lg shadow-lg flex-grow flex flex-col border border-slate-200">
                                    <h2 className="text-base font-bold flex items-center gap-2 font-display" style={{ color: COLORS.textDark }}><FaShieldAlt /> Bed Capacity Alert Panel (BCAP)</h2>
                                    {mciState.isActive ? (
                                        <div className="text-center flex-grow flex flex-col justify-center">
                                            <p className='text-lg font-bold animate-pulse' style={{ color: COLORS.alertRed }}>ALERT ACTIVE in {mciState.region} ZONE</p>
                                            <button onClick={() => setMciState({ isActive: false, region: null })} className="w-full mt-1 font-bold py-1 rounded-lg text-white text-sm bg-slate-700 hover:bg-slate-800">DEACTIVATE</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 flex flex-col flex-grow justify-center mt-1">
                                            <div className="space-y-0.5">
                                                <label className="text-xs font-semibold" style={{ color: COLORS.textMedium }}>1. Select Zone</label>
                                                <select value={mciRegion ?? 'None'} onChange={e => setMciRegion(e.target.value as any)} className="w-full p-1 border rounded bg-white text-xs border-slate-300">
                                                    <option value="None">Select...</option>
                                                    {['North', 'West', 'Central', 'East', 'South'].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-xs font-semibold" style={{ color: COLORS.textMedium }}>2. Confirm</label>
                                                <input type="text" value={mciConfirmText} onChange={e => setMciConfirmText(e.target.value)} placeholder="Type 'CONFIRM'" className="w-full p-1 border rounded text-xs border-slate-300" />
                                            </div>
                                             <button
                                                onClick={handleDeclareMci}
                                                disabled={!canDeclareMci}
                                                className={`w-full font-bold py-1 rounded-lg text-white text-base transition-all duration-300 ${canDeclareMci ? 'bg-red-600 hover:bg-red-700 control-centre-button' : 'bg-gray-400 cursor-not-allowed'}`}
                                            >
                                                DECLARE SHORTAGE
                                            </button>
                                            <p className="text-[10px] text-center font-semibold py-0.5 px-1 rounded" style={{color: COLORS.warningOrange, backgroundColor: '#fffbe6' }}>
                                                Activates upon &gt;90% critical hospitals in a zone.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <PortalFooter ping={Math.round(ping)} />
            
             <CSSTransition nodeRef={modalRef} in={showCriticalModal} timeout={300} classNames="dropdown" unmountOnExit>
                 <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
                    <CriticalHospitalsModal onClose={() => setShowCriticalModal(false)} criticalHospitals={liveData.filter(h => h.bedOccupancy > 85)} liveData={liveData} />
                 </div>
            </CSSTransition>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({message: null, type: null})} />
        </div>
    );
};

export default StrategicPortal;