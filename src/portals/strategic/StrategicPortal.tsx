// src/portals/strategic/StrategicPortal.tsx

import { useState, useMemo, useContext, useEffect, useRef, useCallback } from 'react';
import type { Portal, LiveHospitalData, HistoricalStat } from '../../types';
import { StrategicContext } from '../../App';
import { useTranslations } from '../../hooks/useTranslations';
import { FaGlobeAsia, FaExclamationTriangle, FaSpinner, FaBed, FaSignOutAlt, FaUserShield, FaBars, FaSitemap, FaTimes, FaHeartbeat, FaArrowUp, FaArrowDown, FaChevronDown, FaSmile, FaUserMd, FaShieldAlt, FaProcedures, FaMapMarkedAlt, FaTasks, FaClock, FaCheckCircle, FaHome, FaInfoCircle } from 'react-icons/fa';
import { IconType } from 'react-icons'; 
import IndianLogo from '../../assets/logo.svg';
import { CSSTransition } from 'react-transition-group';

// --- Type Definitions for Local Components (TS Fixes) ---
type TrendType = 'up' | 'down' | 'stable';

interface KpiProps {
    title: string;
    value: string;
    unit?: string;
    color: string;
    icon: IconType;
    isAlert: boolean;
    onClick?: () => void;
    trend: TrendType;
}

interface GenericProps {
    activePortal: Portal;
    setActivePortal: (p: Portal) => void;
    onGoToIntro: () => void;
}

interface NationalStatsType {
    avgOccupancy: number;
    trend_bor: TrendType;
    criticalHospitalPercent: number;
    trend_critical: TrendType;
    avgWaitTime: number;
    trend_wait: TrendType;
    avgALOS: number;
    trend_alos: TrendType;
    adequateResourcePercent: number;
    trend_resources: TrendType;
    avgStaffFatigue: number; 
    trend_fatigue: TrendType;
    avgSatisfaction: number;
    trend_satisfaction: TrendType;
    publicSectorOccupancy: number;
    privateSectorOccupancy: number;
    regionalOccupancy: Record<string, number>;
}

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
    staffFatigue: '#d69e2e', 
    patientSatisfaction: '#805ad5', 
    publicSector: '#06b6d4',
    privateSector: '#6366f1',
    textDark: '#2d3748',
    textMedium: '#4a5568',
    textLight: '#718096',
    bgLight: '#f7fafc',
    bgWhite: '#ffffff',
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

const PortalHeader = ({ activePortal, setActivePortal, onLogout, isSidebarCollapsed, setIsSidebarCollapsed, onGoToIntro }: GenericProps & { onLogout: () => void, isSidebarCollapsed: boolean, setIsSidebarCollapsed: (c: boolean) => void }) => {
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

const StrategicSidebar = ({ isCollapsed, lastUpdated }: { isCollapsed: boolean, lastUpdated: string }) => {
    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col shadow-2xl flex-shrink-0 h-full transition-all duration-300 z-10`}>
            <div className={`p-4 bg-slate-800 flex items-center border-b border-slate-700 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                <div className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">SC</div>
                {!isCollapsed && (
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-white">Strategic Command</p>
                        <p className="text-xs text-gray-300">MoHFW</p>
                        <div className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-green-600 inline-block">Active Session</div>
                    </div>
                )}
            </div>
            <nav className="flex-grow p-4 space-y-1">
                <button
                    className={`flex items-center gap-3 p-3 rounded-lg w-full text-left text-sm transition-colors bg-orange-500 font-bold`}
                    title="National Overview"
                >
                    <FaSitemap size={20} />
                    {!isCollapsed && <span className="truncate">National Overview</span>}
                </button>
            </nav>
            {!isCollapsed && (
                <div className="p-4 mt-auto border-t border-gray-700">
                    <div className='bg-gray-800 rounded-lg p-3 text-center'>
                        <p className='text-xs font-bold text-gray-400 flex items-center justify-center gap-1'><FaClock/> Live Data Feed</p>
                        <p className={`text-sm font-semibold text-green-400`}>Last Updated: {lastUpdated}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const KpiMetric = ({ title, value, unit = '', color, icon: Icon, isAlert, onClick, trend }: KpiProps) => {
    const TrendIcon = trend === 'up' ? FaArrowUp : FaArrowDown;
    let trendColor: string = '';
    
    // Note: This logic for trend color is retained from your provided code
    if (trend === 'up') {
        trendColor = ['Adequate Resources', 'Patient Experience'].includes(title) ? COLORS.safeGreen : COLORS.alertRed;
    } else if (trend === 'down') {
        trendColor = ['Adequate Resources', 'Patient Experience'].includes(title) ? COLORS.alertRed : COLORS.safeGreen;
    }

    let displayValue = title.includes('Avg. Wait Time') ? `${value}` : `${value}`;
    
    // FIX: Only show FaInfoCircle when onClick is provided (for the critical hospitals modal)
    const showInfoIcon = !!onClick; 

    return (
        <div onClick={onClick} className={`text-center group transition-all duration-300 relative px-2 ${onClick ? 'cursor-pointer' : ''}`}>
            {/* Conditional rendering for the info icon */}
            {showInfoIcon && <FaInfoCircle className="absolute top-0 right-1 text-gray-300 group-hover:text-blue-500 transition-colors" size={10} />}
            <p className="text-[11px] font-semibold text-gray-500 flex items-center justify-center gap-1 leading-tight h-6 truncate">
                <Icon size={10} style={{ color }}/> <span>{title}</span>
            </p>
            <div className="flex items-center justify-center gap-1">
              {isAlert && <FaExclamationTriangle className="text-rose-500 animate-pulse" />}
              <p className="font-bold text-xl" style={{ color }}>{displayValue}<span className="text-sm font-semibold">{unit}</span></p>
              {trend && trend !== 'stable' && <TrendIcon style={{ color: trendColor }} size={10} />}
            </div>
        </div>
    );
};


const LogoutScreen = () => (
    <div className="fixed inset-0 bg-slate-800 bg-opacity-90 flex flex-col items-center justify-center z-[200]">
        <FaSpinner className="animate-spin text-white text-4xl" />
        <p className="mt-4 text-white font-semibold">Logging out and clearing session...</p>
    </div>
);


const LoginPage = ({ onLogin, t, activePortal, setActivePortal, onGoToIntro }: GenericProps & { onLogin: () => void, t: (key: string) => string }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
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
                            <h2 className="text-xl font-bold text-gray-800">Welcome, {PORTAL_USER_TITLE}</h2>
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
            <PortalFooter ping={85} />
        </div>
    );
};

const CriticalHospitalsModal = ({ onClose, criticalHospitals, liveData }: { onClose: () => void, criticalHospitals: LiveHospitalData[], liveData: LiveHospitalData[] }) => {
    const regionalData = useMemo(() => {
        const regions: Record<string, number> = { North: 27, South: 41, East: 24, West: 29, Central: 29 };
        const criticalCounts: Record<string, number> = { North: 0, South: 0, East: 0, West: 0, Central: 0 };
        criticalHospitals.forEach(h => {
            if (regions[h.region] !== undefined) {
                 // TS7053 Fix: Safe indexing
                criticalCounts[h.region] = (criticalCounts[h.region] || 0) + 1; 
            }
        });
        
        return ['North', 'West', 'Central', 'East', 'South'].map(regionName => ({
            name: regionName,
            percentage: Math.round((criticalCounts[regionName] / regions[regionName]) * 100)
        }));
    }, [criticalHospitals, liveData]);

    return (
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col">
             <div className="p-4 bg-rose-600 text-white border-b border-rose-700 flex justify-between items-center rounded-t-xl">
                 <h2 className="text-xl font-bold flex items-center gap-2 font-display"><FaExclamationTriangle/> Critical Hospitals Distribution</h2>
                 <button onClick={onClose}><FaTimes size={16} /></button>
            </div>
            <div className='p-6 space-y-4'>
                <div className="text-center">
                    <p className='font-semibold text-gray-700'>Percentage of hospitals in each zone with bed occupancy over 85%.</p>
                </div>
                <div className="text-lg space-y-2">
                    {regionalData.map(({name, percentage}) => (
                        <div key={name} className="flex justify-between items-center font-bold">
                            <span>{name}:</span>
                            <span className={percentage > 0 ? 'text-rose-600' : 'text-emerald-600'}>{percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const RegionalHotspotsChart = ({ stats }: { stats: { region: string, avgOccupancy: number }[] }) => {
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg h-full flex flex-col border border-slate-200">
            <h2 className="text-base font-bold flex items-center gap-2 flex-shrink-0 font-display" style={{ color: COLORS.textDark }}><FaMapMarkedAlt /> Zonal Bed Occupancy</h2>
            <div className="flex-grow flex flex-col justify-around gap-1 px-1 pt-1 relative">
                {/* Note: Order is hardcoded as per screenshot 308 (North, West, Central, East, South) */}
                {['North', 'West', 'Central', 'East', 'South'].map((region) => {
                    const avgOccupancy = stats.find(s => s.region === region)?.avgOccupancy || 0;
                    const width = Math.min(100, avgOccupancy);
                    const color = width > 85 ? COLORS.alertRed : width > 75 ? COLORS.warningOrange : COLORS.primaryBlue;
                    return (
                        <div key={region} className="flex items-center gap-2 group/bar">
                            <span className="w-12 text-xs font-bold" style={{ color: COLORS.textLight }}>{region}</span>
                            <div className="flex-grow bg-slate-200 rounded-full h-3.5 relative overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 transform group-hover/bar:brightness-110`} style={{ width: `${width}%`, background: `linear-gradient(to right, ${color}, ${width > 75 ? COLORS.warningOrange : color})` }}>
                                     <span className="text-white text-[9px] font-bold drop-shadow-sm">{avgOccupancy.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div className="absolute top-8 bottom-2 border-l border-dashed" style={{ right: `calc(15%)`, borderColor: COLORS.alertRed, opacity: 0.7 }}>
                     <div className="absolute -top-5 right-0 transform translate-x-1/2 text-[9px] font-bold px-1 rounded bg-red-100 text-red-600">85%</div>
                </div>
            </div>
        </div>
    );
};

const SystemHealthPanel = ({ stats }: { stats: NationalStatsType }) => {
    const ProgressBar = ({ value, color, label }: { value: number, color: string, label: string }) => (
        <div>
            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-xs font-semibold" style={{ color: COLORS.textMedium }}>{label}</span>
                <span className="text-sm font-bold" style={{color}}>{value.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
                 <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }}></div>
            </div>
        </div>
    );
    
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg h-full flex flex-col border border-slate-200">
             <h2 className="text-base font-bold flex items-center gap-2 font-display" style={{ color: COLORS.textDark }}><FaTasks /> National Performance Index</h2>
             <div className="flex-grow flex flex-col justify-around gap-1 mt-1">
                {/* Note: Using stats object that contains the correct public/private keys. */}
                <ProgressBar value={stats.publicSectorOccupancy} color={COLORS.publicSector} label="Public Sector (BOR)" />
                <ProgressBar value={stats.privateSectorOccupancy} color={COLORS.privateSector} label="Private Sector (BOR)" />
            </div>
        </div>
    );
};

// --- MAIN STRATEGIC PORTAL COMPONENT ---

const StrategicPortal = ({ activePortal, setActivePortal, onGoToIntro }: GenericProps) => {
    const { liveData, mciState, setMciState, nationalHistory } = useContext(StrategicContext);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [ping, setPing] = useState(85);
    const [mciRegion, setMciRegion] = useState<string>('None');
    const [mciConfirmText, setMciConfirmText] = useState('');
    const [showCriticalModal, setShowCriticalModal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [toast, setToast] = useState<{message: string | null, type: string | null}>({message: null, type: null});
    const modalRef = useRef(null);
    const t = useTranslations();

    // FIX: Function declaration wrapped in useCallback to resolve TS7006/TS7031 on parameter typing
    const showToast = useCallback((message: string, type: string = 'info') => {
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

    const nationalStats: NationalStatsType | null = useMemo(() => {
        if (liveData.length === 0 || nationalHistory.length < 2) return null;
        
        const latest: HistoricalStat = nationalHistory[nationalHistory.length - 1];
        const previous: HistoricalStat = nationalHistory[nationalHistory.length - 2];

        const getTrend = (current: number, prev: number): TrendType => {
            if (current > prev) return 'up';
            if (current < prev) return 'down';
            return 'stable';
        };

        const criticalHospitals = liveData.filter(h => h.bedOccupancy > 85);
        const criticalHospitalPercent = (criticalHospitals.length / liveData.length) * 100;
        const prevCriticalHospitalsCount = previous.criticalHospitals;
        
        const resourceStrainedHospitals = liveData.filter(h => h.oxygen_supply_days < 10 || h.ppe_stock_level === 'Critical' || h.ppe_stock_level === 'Stockout');
        const adequateResourcePercent = (1 - (resourceStrainedHospitals.length / liveData.length)) * 100;
        const prevAdequateResourcePercent = (1 - (nationalHistory[nationalHistory.length - 2].criticalHospitals / liveData.length)) * 100;


        // KPI VALUES AS PER YOUR ORIGINAL 6-KPI LAYOUT (Screenshot 308)
        return {
            avgOccupancy: latest.avgOccupancy,
            trend_bor: getTrend(latest.avgOccupancy, previous.avgOccupancy),
            
            criticalHospitalPercent: criticalHospitalPercent,
            trend_critical: getTrend(criticalHospitals.length, prevCriticalHospitalsCount),
            
            avgWaitTime: latest.avgWaitTime,
            trend_wait: getTrend(previous.avgWaitTime, latest.avgWaitTime), 
            
            avgALOS: liveData.reduce((acc, h) => acc + h.ALOS_days, 0) / liveData.length,
            trend_alos: getTrend(liveData.reduce((acc, h) => acc + h.ALOS_days, 0), liveData.reduce((acc, h) => acc + h.ALOS_days, 0)), 
            
            adequateResourcePercent: adequateResourcePercent,
            trend_resources: getTrend(adequateResourcePercent, prevAdequateResourcePercent), 
            
            avgStaffFatigue: latest.avgStaffFatigue, 
            trend_fatigue: getTrend(latest.avgStaffFatigue, previous.avgStaffFatigue),

            avgSatisfaction: latest.avgSatisfaction,
            trend_satisfaction: getTrend(latest.avgSatisfaction, previous.avgSatisfaction),
            
            // Row 2 (Sub-Charts) - Using calculated mock data
            publicSectorOccupancy: (latest.avgOccupancy * 0.95),
            privateSectorOccupancy: (latest.avgOccupancy * 1.15) - 10,
            regionalOccupancy: latest.regionalOccupancy,
        };
    }, [liveData, nationalHistory]);
    
    // Format regional stats for the chart
    const regionalStats = useMemo(() => {
        if (!nationalStats || !nationalStats.regionalOccupancy) return [];
        const latestOccupancy = nationalStats.regionalOccupancy;
        
        const orderedRegions = ['North', 'West', 'Central', 'East', 'South'];
        return orderedRegions.map(region => ({
            region,
            avgOccupancy: latestOccupancy[region] || 0,
        }));
    }, [nationalStats]);


    const eligibleMciRegions = useMemo(() => {
        if(!nationalStats) return [];
        const regions: Record<string, number> = { North: 27, South: 41, East: 24, West: 29, Central: 29 };
        const criticalCounts: Record<string, number> = { North: 0, South: 0, East: 0, West: 0, Central: 0 };
        const criticalHospitals = liveData.filter(h => h.bedOccupancy > 85);
        
        criticalHospitals.forEach(h => {
            // TS7053 Fix: Safe indexing
            criticalCounts[h.region] = (criticalCounts[h.region] || 0) + 1; 
        });
        
        return Object.keys(regions).filter(regionName => {
            const percentage = (criticalCounts[regionName] / regions[regionName]) * 100;
            return percentage >= 90;
        });
    }, [nationalStats, liveData]);
    
    const isAnyZoneCritical = useMemo(() => {
        if (!eligibleMciRegions) return false;
        return eligibleMciRegions.length > 0;
    }, [eligibleMciRegions]);

    const handleDeclareMci = () => {
        const regionToDeclare = mciRegion as LiveHospitalData['region'];
        if (mciRegion && mciRegion !== 'None' && mciConfirmText === 'CONFIRM') {
            setMciState({ isActive: true, region: regionToDeclare });
            showToast(`CAPACITY ALERT DECLARED: Coordinated response protocols are now active for the ${regionToDeclare} zone.`, 'error');
            setMciRegion('None');
            setMciConfirmText('');
        }
    };
    
    const criticalHospitals = liveData.filter(h => h.bedOccupancy > 85);
    const canDeclareMci = mciRegion !== 'None' && mciConfirmText === 'CONFIRM' && eligibleMciRegions.includes(mciRegion);
    
    if (isLoggingOut) return <LogoutScreen />;
    if (!isAuthenticated) {
        // LoginPage handles authentication and redirects upon success
        return <LoginPage onLogin={() => setIsAuthenticated(true)} t={t} activePortal={activePortal} setActivePortal={setActivePortal} onGoToIntro={onGoToIntro} />;
    }

    // FIX: Using FaSpinner component here resolves the original white screen error
    if (!nationalStats) {
        return <div className="flex h-screen items-center justify-center bg-slate-100"><FaSpinner className="animate-spin text-slate-800" size={48} /></div>;
    }

    return (
        <div className="flex flex-col h-screen font-sans overflow-hidden bg-slate-100">
            <PortalHeader activePortal={activePortal} setActivePortal={setActivePortal} onLogout={handleLogout} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} onGoToIntro={onGoToIntro} />
            <div className="flex flex-grow overflow-hidden min-h-0">
                <StrategicSidebar isCollapsed={isSidebarCollapsed} lastUpdated={lastUpdated} />
                {/* FINAL FIX: px-2 for minimal side padding, py-0 to kill scrollbar, space-y-2 for internal gaps. */}
                <main className="flex-grow flex flex-col px-2 py-0 overflow-y-auto space-y-2">
                    {/* TOP-LEVEL METRICS (6-KPI Layout from Screenshot 308) */}
                    {/* Added mt-2 margin to the top element for spacing below the header */}
                    <div className='grid grid-cols-6 bg-white p-2 rounded-lg shadow-lg flex-shrink-0 divide-x divide-slate-200 mt-2'>
                        <KpiMetric title="National BOR" value={nationalStats.avgOccupancy.toFixed(1)} unit="%" color={COLORS.primaryBlue} icon={FaBed} isAlert={nationalStats.avgOccupancy > 85} trend={nationalStats.trend_bor} onClick={undefined} />
                        <KpiMetric title="Hospitals >85% BOR" value={nationalStats.criticalHospitalPercent.toFixed(1)} unit="%" color={COLORS.alertRed} icon={FaHeartbeat} isAlert={nationalStats.criticalHospitalPercent > 18 || isAnyZoneCritical} onClick={() => setShowCriticalModal(true)} trend={nationalStats.trend_critical} />
                        <KpiMetric title="Avg. Wait Time" value={nationalStats.avgWaitTime.toFixed(0)} unit=" min" color={nationalStats.avgWaitTime > 90 ? COLORS.alertRed : COLORS.warningOrange} icon={FaClock} isAlert={nationalStats.avgWaitTime > 120} trend={nationalStats.trend_wait} onClick={undefined} />
                        <KpiMetric title="Avg. Length of Stay" value={nationalStats.avgALOS.toFixed(1)} unit=" days" color={COLORS.safeGreen} icon={FaProcedures} isAlert={nationalStats.avgALOS > 6} trend={nationalStats.trend_alos} onClick={undefined} />
                        <KpiMetric title="Staff Duty Load" value={nationalStats.avgStaffFatigue.toFixed(1)} unit="%" color={COLORS.staffFatigue} icon={FaUserMd} isAlert={nationalStats.avgStaffFatigue > 70} trend={nationalStats.trend_fatigue} onClick={undefined}/>
                        <KpiMetric title="Patient Experience" value={nationalStats.avgSatisfaction.toFixed(1)} unit="%" color={COLORS.patientSatisfaction} icon={FaSmile} isAlert={nationalStats.avgSatisfaction < 65} trend={nationalStats.trend_satisfaction} onClick={undefined}/>
                    </div>

                    {/* CHART AND ALERT PANELS (2-column split layout from Screenshot 308) */}
                    {/* Added mb-2 margin to the bottom element to create space above the footer */}
                    <div className="flex-grow grid grid-cols-12 gap-2 mb-2">
                        {/* Left Column: Zonal Chart (col-span-7) */}
                        <div className="col-span-7 h-full">
                            <RegionalHotspotsChart stats={regionalStats} />
                        </div>
                        
                        {/* Right Column: Performance Index and BCAP Panel (col-span-5) */}
                        <div className="col-span-5 flex flex-col gap-2 h-full">
                            <SystemHealthPanel stats={nationalStats} />
                            <div className="bg-white p-3 rounded-lg shadow-lg flex-grow flex flex-col border border-slate-200">
                                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: COLORS.textDark }}><FaShieldAlt /> Bed Capacity Alert Panel (BCAP)</h2>
                                {mciState.isActive ? (
                                    <div className="text-center flex-grow flex flex-col justify-center">
                                        <p className='text-lg font-bold animate-pulse' style={{ color: COLORS.alertRed }}>ALERT ACTIVE in {mciState.region} ZONE</p>
                                        <button onClick={() => setMciState({ isActive: false, region: null })} className="w-full mt-1 font-bold py-1 rounded-lg text-white text-sm bg-slate-700 hover:bg-slate-800">DEACTIVATE</button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 flex flex-col flex-grow justify-center mt-1">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold" style={{ color: COLORS.textMedium }}>1. Select Zone</label>
                                            <select value={mciRegion} onChange={e => setMciRegion(e.target.value)} className="w-full p-2 border rounded bg-white text-sm border-slate-300">
                                                <option value="None">Select...</option>
                                                {['North', 'West', 'Central', 'East', 'South'].map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold" style={{ color: COLORS.textMedium }}>2. Confirm</label>
                                            <input type="text" value={mciConfirmText} onChange={e => setMciConfirmText(e.target.value)} placeholder="Type 'CONFIRM'" className="w-full p-2 border rounded text-sm border-slate-300" />
                                        </div>
                                        <button
                                            onClick={handleDeclareMci}
                                            disabled={!canDeclareMci}
                                            className={`w-full font-bold py-2 rounded-lg text-white text-base transition-all duration-300 ${canDeclareMci ? 'bg-red-600 hover:bg-red-700 control-centre-button' : 'bg-gray-400 cursor-not-allowed'}`}
                                        >
                                            DECLARE SHORTAGE
                                        </button>
                                        <p className="text-[10px] text-center font-semibold py-0.5 px-1 rounded bg-red-50 text-red-700">
                                            Activates upon &gt;90% critical hospitals in a zone.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <PortalFooter ping={Math.round(ping)} />
            
             <CSSTransition nodeRef={modalRef} in={showCriticalModal} timeout={300} classNames="dropdown" unmountOnExit>
                 <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
                    <CriticalHospitalsModal onClose={() => setShowCriticalModal(false)} criticalHospitals={criticalHospitals} liveData={liveData} />
                 </div>
            </CSSTransition>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({message: null, type: null})} />
        </div>
    );
};

export default StrategicPortal;