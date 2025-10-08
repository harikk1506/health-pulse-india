// src/portals/hospital/HospitalPortal.tsx

import React, { useState, useEffect, useMemo, useRef, useContext, useCallback } from 'react';
import type { LiveHospitalData, AuditLogEntry, HistoricalDataPoint, Portal, Metric, HistoricalPeriod, Hospital, OwnershipType } from '../../types';
import { generateHospitalHistory } from '../../utils/helpers_strategic';
// FIX: Import IconType from 'react-icons' to fix TS2459
import { IconType } from 'react-icons';
import { FaBed, FaClinicMedical, FaSpinner, FaTimes, FaUserMd, FaSave, FaSignOutAlt, FaTachometerAlt, FaAmbulance, FaCheckCircle, FaExclamationTriangle, FaBuilding, FaFirstAid, FaHistory, FaFileMedicalAlt, FaChevronDown, FaLink, FaSmile, FaPhone, FaBars, FaHome } from 'react-icons/fa';
import { StrategicContext } from '../../App';
import { useTranslations } from '../../hooks/useTranslations';
import { CSSTransition } from 'react-transition-group';

// --- CONFIGURATION ---
const HOSPITAL_ID_CONTEXT = 150; // Government Theni Medical College Hospital
const NODAL_OFFICER_NAME = "Dr. Anand Kumar";
const NODAL_OFFICER_ID = "NO-GTMCH-150";

// --- METRIC MAPPING --
const METRICS: Metric[] = ['occupancy', 'waitTime', 'fatigue', 'satisfaction'];

const METRIC_CONFIG: Record<Metric, { title: string; icon: IconType; color: string; }> = {
    occupancy: { title: 'Bed Occupancy Rate', icon: FaBed, color: "#2980b9" },
    waitTime: { title: 'Emergency Department Wait Time', icon: FaHistory, color: "#f39c12" },
    fatigue: { title: 'Staff Duty Load', icon: FaUserMd, color: "#d35400" },
    satisfaction: { title: 'Patient Experience Score', icon: FaSmile, color: "#8e44ad" },
};

// REFINEMENT: Updated PPE Categories for Dropdown
const PPE_OPTIONS: { value: Hospital['ppe_stock_level'], label: string }[] = [
    { value: 'Good', label: '🟢 Good (>30 days)' },
    { value: 'Low', label: '🟡 Low (15–30 days)' },
    { value: 'Critical', label: '🟠 Critical (7–14 days)' },
    { value: 'Stockout', label: '🔴 Stockout (<7 days)' },
];

const OWNERSHIP_OPTIONS: OwnershipType[] = [
    'Government (Central)', 'Government (State)', 'Government (UT)',
    'Private (Large)', 'Private (Mid-size)', 'Private (Trust)', 'Private (Speciality)'
];


// --- REUSABLE COMPONENTS ---

const Toast = ({ message, type, onClose }: { message: string | null, type: string | null, onClose: () => void }) => {
    if (!message) return null;
    let colorClass = type === 'success' ? "bg-green-600" : type === 'error' ? "bg-red-600" : type === 'info' ? "bg-blue-600" : "bg-yellow-600";
    let Icon = type === 'success' ? FaCheckCircle : type === 'error' ? FaExclamationTriangle : type === 'info' ? FaAmbulance : FaExclamationTriangle;
    return ( <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-2xl z-[100] flex items-center gap-3 font-semibold text-white ${colorClass}`}> <Icon size={20} /> {message} <button onClick={onClose} className="ml-4 opacity-75 hover:opacity-100"> <FaTimes size={12} /> </button> </div> );
};


function HospitalAppHeader({ selectedHospital, activePortal, setActivePortal, isSidebarCollapsed, setIsSidebarCollapsed, onGoToIntro }:
    { selectedHospital: LiveHospitalData; activePortal: Portal; setActivePortal: (p: Portal) => void; onLogout: () => void; isSidebarCollapsed: boolean; setIsSidebarCollapsed: (c: boolean) => void; onGoToIntro: () => void; }) {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const t = useTranslations();
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];

    return (
        <header className="bg-white p-2 shadow-sm flex items-center justify-between flex-shrink-0 border-b-4 border-teal-600">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 rounded hover:bg-gray-100 text-gray-700" title={isSidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}>
                    <FaBars size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FaClinicMedical className="text-teal-600" size={24} /> {selectedHospital.name}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                 <button onClick={onGoToIntro} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors" title="Go to Intro Page">
                    <FaHome />
                </button>
                 <a href={`tel:${selectedHospital.helpline}`} className='bg-red-600 text-white font-extrabold flex items-center gap-2 py-2 px-4 rounded-lg shadow-lg hover:bg-red-700 transition-shadow' title="Call Emergency Command Center">
                        <FaPhone size={16} /> EMERGENCY LINE
                 </a>
                <div className="relative z-40">
                    <button onClick={() => setDropdownOpen(p => !p)} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300">
                        {t(`portal.${activePortal.toLowerCase()}`)} <FaChevronDown size={12} />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border z-50 w-48 py-1">
                            <p className='text-xs font-semibold text-gray-500 px-3 py-1 border-b'>{t('switch.portal')}</p>
                            {portals.map(p => (
                                <button key={p} onClick={() => { setActivePortal(p); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${activePortal === p ? 'bg-teal-500 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    {t(`portal.${p.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

const HospitalSidebar = ({ setIsAuthenticated, activeMenu, setActiveMenu, isCollapsed, syncStatus }:
    { setIsAuthenticated: (status: boolean) => void, activeMenu: string, setActiveMenu: (menu: string) => void, isCollapsed: boolean, syncStatus: { color: string, text: string } }) => {
    const t = useTranslations();
    const menuItems = [ { key: 'Dashboard', icon: FaTachometerAlt }, { key: 'Manual Reporting', icon: FaFileMedicalAlt } ];

    const statusBg = 'bg-teal-700';
    const statusText = 'Active Session';

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-900 text-white flex flex-col shadow-2xl transition-all duration-300 flex-shrink-0`}>
            <div className={`p-4 bg-gray-800 flex items-center border-b border-gray-700 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">AK</div>
                {!isCollapsed && (
                    <div className="ml-3 leading-tight">
                        <p className="text-sm font-semibold text-white">{NODAL_OFFICER_NAME}</p>
                        <p className="text-xs text-gray-400">{t('hospital.sidebar.nodal.officer')}</p>
                        <div className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${statusBg}`}>{statusText}</div>
                    </div>
                )}
            </div>
            <nav className="flex-grow p-4 space-y-1">
                {menuItems.map(item => (
                    <button key={item.key} onClick={() => setActiveMenu(item.key)} className={`flex items-center gap-3 p-3 rounded-lg w-full text-left text-sm transition-colors relative ${activeMenu === item.key ? 'bg-teal-600 font-bold' : 'text-gray-300 hover:bg-gray-700'} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? item.key : ''}>
                        <item.icon size={20} /> {!isCollapsed && <span>{t(`hospital.${item.key.replace(/\s/g, '').toLowerCase()}.title`)}</span>}
                    </button>
                ))}
                {!isCollapsed && (
                    <div className='pt-4'>
                        <div className='bg-gray-800 rounded-lg p-3 text-center'>
                             <p className='text-xs font-bold text-gray-400'>Live Sync Status</p>
                             <p className={`text-sm font-semibold flex items-center justify-center gap-2 ${syncStatus.color}`}><FaLink /> {syncStatus.text}</p>
                             <p className='text-[10px] text-gray-500'>Last Update: {new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                )}
            </nav>
            <div className="p-4 mt-auto border-t border-gray-700">
                <button onClick={() => setIsAuthenticated(true)} className={`flex items-center gap-3 p-3 rounded-lg w-full text-white font-bold bg-red-600 hover:bg-red-700 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'Logout' : ''}>
                    <FaSignOutAlt size={20} /> {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
};

const movingAverage = (data: HistoricalDataPoint[], dataKey: keyof HistoricalDataPoint, windowSize: number = 5): HistoricalDataPoint[] => {
    if (!data || data.length === 0) return [];

    const actualWindowSize = data.length > 30 ? 5 : windowSize;

    return data.map((point, index) => {
        const start = Math.max(0, index - Math.floor(actualWindowSize / 2));
        const end = Math.min(data.length, index + Math.ceil(actualWindowSize / 2));

        const window = data.slice(start, end);
        const sum = window.reduce((acc, current) => acc + (current[dataKey] || 0), 0);
        const average = sum / window.length;

        return { ...point, [dataKey]: average };
    });
};


const KpiCard = ({ title, value, unit = '', icon: Icon, color, onClick, details, hospital }:
    { title: string, value?: string, unit?: string, icon: React.ElementType, color: string, onClick?: () => void, details?: { label: string, value: string }[], hospital: LiveHospitalData }) => {

    let statusText = '';
    let statusColor = color;

    let highValue = 0;
    if (title.includes('Wait Time')) {
        highValue = hospital.currentWaitTime;
    } else {
        highValue = details ? Math.max(parseFloat(details[0].value), parseFloat(details[1].value)) : parseFloat(value || '0');
    }

    if (title.includes('Occupancy')) {
        if (highValue > 90) { statusColor = '#e74c3c'; statusText = 'Critical'; }
        else if (highValue > 75) { statusColor = '#e67e22'; statusText = 'Warning'; }
        else { statusColor = '#2ecc71'; statusText = 'Optimal'; }
    } else if (title.includes('Wait Time')) {
        if (highValue >= 120) { statusColor = '#e74c3c'; statusText = 'CRITICAL OVERDUE'; }
        else if (highValue > 60) { statusColor = '#e67e22'; statusText = 'High Strain'; }
        else { statusColor = '#2ecc71'; statusText = 'Normal'; }
    } else if (title.includes('Duty Load')) {
        if (highValue > 70) { statusColor = '#e74c3c'; statusText = 'High Risk'; }
        else if (highValue > 50) { statusColor = '#e67e22'; statusText = 'Moderate'; }
        else { statusColor = '#2ecc71'; statusText = 'Low Risk'; }
    } else if (title.includes('Experience Score')) {
        if (highValue < 65) { statusColor = '#e74c3c'; statusText = 'COMPLIANCE ALERT'; }
        else if (highValue < 80) { statusColor = '#f1c40f'; statusText = 'Average'; }
        else { statusColor = '#2ecc71'; statusText = 'High'; }
    }

    return (
        <button onClick={onClick} className="bg-white p-4 rounded-lg shadow-lg border-l-4 w-full text-left hover:shadow-2xl hover:scale-[1.01] transition-all duration-200" style={{ borderColor: statusColor }}>
            <div className="flex items-start justify-between">
                <div className='flex items-center'>
                    <div className="p-3 rounded-full text-white" style={{ backgroundColor: statusColor }}><Icon size={20} /></div>
                    <p className="text-sm font-medium text-gray-500 ml-4">{title}</p>
                </div>
                <span className='text-xs font-bold px-2 py-1 rounded-full text-white' style={{ backgroundColor: statusColor }}>{statusText}</span>
            </div>
            <div className="mt-2">
                {details ? (
                    <div className="grid grid-cols-2 gap-x-4">
                        {details.map(detail => (
                            <div key={detail.label}>
                                <p className="text-xs text-gray-500">{detail.label}</p>
                                <p className="2xl font-bold text-gray-800">{detail.value}%</p>
                            </div>
                        ))}
                    </div>
                ) : (
                     <p className="text-3xl font-bold text-gray-800">{value}<span className='text-xl font-semibold ml-1 text-gray-500'>{unit}</span></p>
                )}
            </div>
        </button>
    );
};


// --- VIEWS ---

const DashboardView = ({ hospital, onCardClick, activityFeed }: { hospital: LiveHospitalData, onCardClick: (metric: Metric) => void, activityFeed: string[] }) => {
    const waitTimeVal = hospital.currentWaitTime.toFixed(0);
    const fatigueVal = hospital.staffFatigue_score.toFixed(1);
    const satisfactionVal = hospital.patientSatisfaction_pct.toFixed(1);

    const logRef = useRef<HTMLDivElement>(null);

    return (
        <div className='space-y-4'>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <KpiCard
                    title={METRIC_CONFIG.occupancy.title}
                    hospital={hospital}
                    icon={METRIC_CONFIG.occupancy.icon}
                    color={METRIC_CONFIG.occupancy.color}
                    onClick={() => onCardClick('occupancy')}
                    details={[
                        { label: 'General Beds', value: hospital.bedOccupancy.toFixed(1) },
                        { label: 'ICU Beds', value: hospital.icuBedOccupancy.toFixed(1) }
                    ]}
                />
                <KpiCard
                    title={METRIC_CONFIG.waitTime.title}
                    hospital={hospital}
                    value={`~${waitTimeVal}`}
                    unit=" mins"
                    icon={METRIC_CONFIG.waitTime.icon}
                    color={METRIC_CONFIG.waitTime.color}
                    onClick={() => onCardClick('waitTime')}
                />
                <KpiCard
                    title={METRIC_CONFIG.fatigue.title}
                    hospital={hospital}
                    value={fatigueVal}
                    unit="%"
                    icon={METRIC_CONFIG.fatigue.icon}
                    color={METRIC_CONFIG.fatigue.color}
                    onClick={() => onCardClick('fatigue')}
                />
                <KpiCard
                    title={METRIC_CONFIG.satisfaction.title}
                    hospital={hospital}
                    value={satisfactionVal}
                    unit="%"
                    icon={METRIC_CONFIG.satisfaction.icon}
                    color={METRIC_CONFIG.satisfaction.color}
                    onClick={() => onCardClick('satisfaction')}
                />
            </div>
             <div className='bg-white p-4 rounded-lg shadow-md border-t-4 border-red-500'>
                 <h2 className="text-xl font-bold text-gray-700 mb-2 flex items-center gap-2">Real-Time Activity Feed</h2>
                 <div ref={logRef} className='text-xs text-gray-600 h-20 overflow-y-auto border rounded p-2 bg-gray-50 space-y-1'>
                     {activityFeed.length === 0 ? (
                         <p className='text-gray-400'>Awaiting new operational events...</p>
                     ) : (
                         activityFeed.map((log, i) => (
                             <p key={i} className='py-0.5' dangerouslySetInnerHTML={{ __html: log }}></p>
                         ))
                     )}
                 </div>
             </div>
        </div>
    );
};

const ComplianceChecklist = ({ checklist, setChecklist }: {checklist: {bedsVerified: boolean, suppliesVerified: boolean, profileVerified: boolean}, setChecklist: React.Dispatch<React.SetStateAction<{bedsVerified: boolean, suppliesVerified: boolean, profileVerified: boolean}>>}) => (
    <div className="bg-white p-3 rounded-lg shadow-md flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-700 mb-2">Pre-Submission Checklist</h2>
        <ul className="text-sm space-y-1.5 text-gray-600">
            <li className="flex items-center gap-2">
                <input type="checkbox" id="check1" checked={checklist.bedsVerified} onChange={() => setChecklist(p => ({...p, bedsVerified: !p.bedsVerified}))} className="h-4 w-4" />
                <label htmlFor="check1" className="cursor-pointer">Critical Supplies Verified</label>
            </li>
            <li className="flex items-center gap-2">
                <input type="checkbox" id="check2" checked={checklist.suppliesVerified} onChange={() => setChecklist(p => ({...p, suppliesVerified: !p.suppliesVerified}))} className="h-4 w-4" />
                <label htmlFor="check2" className="cursor-pointer">Bed Capacity Verified.</label>
            </li>
            <li className="flex items-center gap-2">
                <input type="checkbox" id="check3" checked={checklist.profileVerified} onChange={() => setChecklist(p => ({...p, profileVerified: !p.profileVerified}))} className="h-4 w-4" />
                <label htmlFor="check3" className="cursor-pointer">Hospital Profile Verified.</label>
            </li>
        </ul>
    </div>
);

const ManualReportingView = ({ hospital, setNodalConfigOverride, auditLog, setAuditLog, showToast, lastCriticalUpdate }: { hospital: LiveHospitalData, setNodalConfigOverride: (config: any) => void, auditLog: AuditLogEntry[], setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>, showToast: (msg: string, type: string) => void, lastCriticalUpdate: number }) => {
    const sessionStartTime = useMemo(() => new Date().toLocaleTimeString(), []);

    const HOURLY_CHECK_DURATION_MS = 1 * 60 * 60 * 1000;
    const isOverdue = Date.now() - lastCriticalUpdate > HOURLY_CHECK_DURATION_MS;

    const [formData, setFormData] = useState({
        name: hospital.name,
        totalBeds: hospital.totalBeds,
        totalICU: hospital.totalICU,
        oxygen_supply_days: Math.round(hospital.oxygen_supply_days),
        ppe_stock_level: hospital.ppe_stock_level,
        helpline: hospital.helpline,
        minConsultCharge: hospital.minConsultCharge,
        type: hospital.type,
        isTeachingHospital: hospital.isTeachingHospital,
        availableHours: hospital.availableHours.includes("24x7"),
    });

    const [checklist, setChecklist] = useState({
        bedsVerified: false,
        suppliesVerified: false,
        profileVerified: false,
    });

    const isAnyChecklistItemChecked = Object.values(checklist).some(Boolean);

    const isFormChanged =
        formData.name !== hospital.name ||
        formData.totalBeds !== hospital.totalBeds ||
        formData.totalICU !== hospital.totalICU ||
        formData.oxygen_supply_days !== Math.round(hospital.oxygen_supply_days) ||
        formData.ppe_stock_level !== hospital.ppe_stock_level ||
        formData.helpline !== hospital.helpline ||
        formData.minConsultCharge !== hospital.minConsultCharge ||
        formData.type !== hospital.type ||
        formData.isTeachingHospital !== hospital.isTeachingHospital ||
        formData.availableHours !== hospital.availableHours.includes("24x7");

    const isSubmitDisabled = !isFormChanged && !isAnyChecklistItemChecked;

    const handleFormChange = (key: keyof typeof formData, value: any) => {
        setFormData(p => ({...p, [key]: value}));
    }

    const handleSave = () => {
        const timestamp = new Date().toLocaleTimeString();
        const newLog: AuditLogEntry[] = [];

        if (formData.totalBeds !== hospital.totalBeds) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Capacity Updated: Total Beds', oldValue: hospital.totalBeds, newValue: formData.totalBeds }); }
        if (formData.totalICU !== hospital.totalICU) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Capacity Updated: Total ICU', oldValue: hospital.totalICU, newValue: formData.totalICU }); }
        if (formData.ppe_stock_level !== hospital.ppe_stock_level) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'PPE Status Updated', oldValue: hospital.ppe_stock_level, newValue: formData.ppe_stock_level }); }
        if (formData.oxygen_supply_days !== Math.round(hospital.oxygen_supply_days)) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Oxygen Days Updated', oldValue: Math.round(hospital.oxygen_supply_days), newValue: formData.oxygen_supply_days }); }

        if (formData.name !== hospital.name) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Profile Updated: Name', oldValue: hospital.name, newValue: formData.name }); }
        if (formData.helpline !== hospital.helpline) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Profile Updated: Helpline', oldValue: hospital.helpline, newValue: formData.helpline }); }
        if (formData.minConsultCharge !== hospital.minConsultCharge) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Profile Updated: Min Charge', oldValue: hospital.minConsultCharge, newValue: formData.minConsultCharge }); }
        if (formData.type !== hospital.type) { newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Profile Updated: Type', oldValue: hospital.type, newValue: formData.type }); }
        if (formData.isTeachingHospital !== hospital.isTeachingHospital) {
            newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Profile Updated: Teaching', oldValue: hospital.isTeachingHospital ? 'Yes' : 'No', newValue: formData.isTeachingHospital ? 'Yes' : 'No' });
        }
        if (formData.availableHours !== hospital.availableHours.includes("24x7")) {
            const oldValue = hospital.availableHours.includes("24x7") ? '24/7' : 'Limited';
            const newValue = formData.availableHours ? '24/7' : 'Limited';
            newLog.push({ timestamp, officer: NODAL_OFFICER_NAME, action: 'Profile Updated: 24/7 Status', oldValue, newValue });
        }

        setAuditLog(p => newLog.concat(p).slice(0, 10));

        setNodalConfigOverride({ hospitalId: hospital.id, totalBeds: formData.totalBeds, totalICU: formData.totalICU, activeUntil: Date.now() + 300000, oxygen_supply_days: formData.oxygen_supply_days, ppe_stock_level: formData.ppe_stock_level });

        showToast("Data validated and successfully synced to national server.", "success");

        setChecklist({ bedsVerified: false, suppliesVerified: false, profileVerified: false });
    };

    return (
        <div className={`grid grid-cols-12 gap-4 h-full`}>

            {isOverdue && (
                 <div className='col-span-12 bg-red-100 p-2 rounded-lg border-l-4 border-red-600 text-red-800 font-semibold flex items-center justify-center gap-2'>
                    <FaExclamationTriangle size={18}/>
                    MANDATORY CRITICAL CHECK: Status update is overdue. Please update immediately.
                 </div>
            )}

            <div className="col-span-9 flex flex-col space-y-3">
                <div className='flex flex-shrink-0 gap-4'>
                     <div className='bg-white p-4 rounded-lg shadow-md border-t-4 border-orange-600 flex-[6]'>
                        <h2 className='font-bold text-xl text-orange-700 mb-2 flex items-center gap-2'>
                            <FaFirstAid/> Critical Supply Status
                        </h2>
                         <div className='grid grid-cols-2 gap-4 items-start'>
                            <div>
                                <label className='text-sm font-semibold'>Oxygen Supply (Days)</label>
                                <input type="number" value={formData.oxygen_supply_days}
                                    onChange={e => handleFormChange('oxygen_supply_days', parseInt(e.target.value) || 0)}
                                    className='w-full p-2 border rounded mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    min="0" />
                            </div>
                            <div>
                                <label className='text-sm font-semibold'>PPE Stock Level</label>
                                <select value={formData.ppe_stock_level} onChange={e => handleFormChange('ppe_stock_level', e.target.value as Hospital['ppe_stock_level'])} className='w-full p-2 border rounded mt-1 bg-white'>
                                    {PPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className='bg-white p-3 rounded-lg shadow-md border-t-4 border-green-600 flex-[4]'>
                        <h2 className='font-bold text-xl text-green-700 mb-2 flex items-center gap-2'><FaBed/> Capacity Reporting</h2>
                        <div className='grid grid-cols-2 gap-3'>
                            <div>
                                <label className='text-sm font-semibold'>Total Beds</label>
                                <input type="number" value={formData.totalBeds}
                                    onChange={e => handleFormChange('totalBeds', parseInt(e.target.value) || 0)}
                                    className='w-full p-2 border rounded mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    min="0" />
                            </div>
                            <div>
                                <label className='text-sm font-semibold'>Total ICU Beds</label>
                                <input type="number" value={formData.totalICU}
                                    onChange={e => handleFormChange('totalICU', parseInt(e.target.value) || 0)}
                                    className='w-full p-2 border rounded mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    min="0" max={formData.totalBeds} />
                            </div>
                        </div>
                    </div>
                </div>

                 <div className='bg-white p-3 rounded-lg shadow-md border-t-4 border-blue-600 min-h-0'>
                    <h2 className='font-bold text-xl text-blue-700 mb-3 flex items-center gap-2'><FaBuilding/> Hospital Profile</h2>
                    <div className='space-y-1'>
                        <div>
                            <label className='text-sm font-semibold'>Hospital Name</label>
                            <input type="text" value={formData.name}
                                onChange={e => handleFormChange('name', e.target.value)}
                                className='w-full p-2 border rounded mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' />
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <label className='text-sm font-semibold'>Helpline Number</label>
                                <input type="text" value={formData.helpline}
                                    onChange={e => handleFormChange('helpline', e.target.value)}
                                    className='w-full p-2 border rounded mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' />
                            </div>
                            <div>
                                <label className='text-sm font-semibold'>Minimum Consultation Fee</label>
                                <input type="number" value={formData.minConsultCharge}
                                    onChange={e => handleFormChange('minConsultCharge', parseInt(e.target.value) || 0)}
                                    className='w-full p-2 border rounded mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' min="0" />
                            </div>
                             <div>
                                 <label className='text-sm font-semibold'>Ownership/Type</label>
                                 <select value={formData.type} onChange={e => handleFormChange('type', e.target.value as OwnershipType)} className='w-full p-2 border rounded mt-1 bg-white'>
                                    {OWNERSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className='space-y-1 pt-1'>
                                <label className='flex items-center gap-2'><input type="checkbox" checked={formData.availableHours} onChange={e => handleFormChange('availableHours', e.target.checked)} className='h-4 w-4' /><span className='font-semibold text-sm'>24/7 Emergency Services</span></label>
                                <label className='flex items-center gap-2'><input type="checkbox" checked={formData.isTeachingHospital} onChange={e => handleFormChange('isTeachingHospital', e.target.checked)} className='h-4 w-4' /><span className='font-semibold text-sm'>Is a Teaching Hospital</span></label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='col-span-3 flex flex-col space-y-3'>
                 <button onClick={handleSave} disabled={isSubmitDisabled} className={`w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-lg flex-shrink-0 shadow-lg ${isSubmitDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}>
                    <FaSave /> Submit Update
                 </button>

                <ComplianceChecklist checklist={checklist} setChecklist={setChecklist} />

                 <div className="bg-white p-3 rounded-lg shadow-md flex-grow flex flex-col min-h-0">
                     <h2 className="text-xl font-bold text-gray-700 mb-2">Data Entry Log</h2>
                     <div className={`text-xs text-gray-600 overflow-y-auto border rounded p-2 bg-gray-50 h-32`}>
                        <p className='text-gray-500 font-bold border-b py-1 mb-1'>[Session Start Time: {sessionStartTime}]</p>
                        {auditLog.length === 0 ? <p className='text-gray-400'>No manual changes logged in this session. The log clears on logout.</p> :
                            auditLog.map((log, i) => <p key={i} className='border-b py-1'>[{log.timestamp}] **{log.action}** changed from `{log.oldValue}` to `{log.newValue}` by *{log.officer}*.</p>)
                        }
                     </div>
                </div>
            </div>
        </div>
    );
};

const MetricDetailModal = ({ hospital, historyData, metric, onClose }: { hospital: LiveHospitalData, historyData: HistoricalDataPoint[], metric: Metric | null, onClose: () => void }) => {
    const { liveData: strategicLiveData } = useContext(StrategicContext);
    const modalRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [period, setPeriod] = useState<HistoricalPeriod>('24h');
    const [liveChartData, setLiveChartData] = useState<HistoricalDataPoint[]>([]);

    useEffect(() => {
        if (metric) {
            setCurrentPage(METRICS.indexOf(metric));
            setPeriod('24h');
        }
    }, [metric]);

    useEffect(() => {
        setIsLoading(true);
        const loadingDurations = { '24h': 500, '7d': 1000, '30d': 1500 };
        const timer = setTimeout(() => setIsLoading(false), loadingDurations[period]);
        return () => clearTimeout(timer);
    }, [period, currentPage]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (period === '24h') {
            const currentHospitalState = strategicLiveData.find(h => h.id === hospital.id);
            if (!currentHospitalState) return;

            const initialData = Array.from({ length: 100 }, (_, i) => {
                const time = new Date(Date.now() - (100 - i) * 3000);
                return {
                    date: time.toISOString(),
                    avgOccupancy: currentHospitalState.bedOccupancy + (Math.random() - 0.5) * 2,
                    avgICUOccupancy: currentHospitalState.icuBedOccupancy + (Math.random() - 0.5) * 3,
                    avgWaitTime: currentHospitalState.currentWaitTime + (Math.random() - 0.5) * 10,
                    staffFatigue: currentHospitalState.staffFatigue_score + (Math.random() - 0.5) * 2,
                    satisfaction: currentHospitalState.patientSatisfaction_pct + (Math.random() - 0.5) * 2,
                };
            });
            setLiveChartData(initialData);

            interval = setInterval(() => {
                const updatedHospitalState = strategicLiveData.find(h => h.id === hospital.id);
                 if (!updatedHospitalState) return;

                const newPoint: HistoricalDataPoint = {
                    date: new Date().toISOString(),
                    avgOccupancy: updatedHospitalState.bedOccupancy,
                    avgICUOccupancy: updatedHospitalState.icuBedOccupancy,
                    avgWaitTime: updatedHospitalState.currentWaitTime,
                    staffFatigue: updatedHospitalState.staffFatigue_score,
                    satisfaction: updatedHospitalState.patientSatisfaction_pct,
                };

                setLiveChartData(prevData => [...prevData.slice(1), newPoint]);

            }, 3000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [period, hospital.id, strategicLiveData]);

    const currentMetric = METRICS[currentPage];
    const config = METRIC_CONFIG[currentMetric];

    const displayData = useMemo(() => {
        let dataToProcess: HistoricalDataPoint[] = [];
        let keyToSmooth: keyof HistoricalDataPoint = 'avgOccupancy'; // Default

        if (period === '24h') {
            dataToProcess = liveChartData;
        } else if (period === '7d') {
            dataToProcess = historyData.slice(-7);
        } else { // 30d
            dataToProcess = historyData;
        }

        if (currentMetric === 'occupancy') {
            const smoothedBed = movingAverage(dataToProcess, 'avgOccupancy', 3);
            const smoothedICU = movingAverage(dataToProcess, 'avgICUOccupancy', 3);
            return smoothedBed.map((point, i) => ({ ...point, avgICUOccupancy: smoothedICU[i].avgICUOccupancy }));
        }
        
        // Map metric to the correct data key
        if(currentMetric === 'waitTime') keyToSmooth = 'avgWaitTime';
        if(currentMetric === 'fatigue') keyToSmooth = 'staffFatigue';
        if(currentMetric === 'satisfaction') keyToSmooth = 'satisfaction';


        return movingAverage(dataToProcess, keyToSmooth, 3);

    }, [historyData, period, liveChartData, currentMetric]);

    const LineChart = ({ data, dataKeys, yMax, colors, benchmark, benchmarkLabel, zones, yMin = 0, yAxisCustomMarks }: { data: HistoricalDataPoint[], dataKeys: (keyof HistoricalDataPoint)[], yMax: number, colors: string[], benchmark?: number, benchmarkLabel?: string, zones?: {min: number, max: number, color: string}[], yMin?: number, yAxisCustomMarks: string[] }) => {
        const svgRef = useRef<SVGSVGElement>(null);
        const width = 700; const height = 220;
        const padding = { top: 10, right: 100, bottom: 30, left: 40 };

        const customLabelColors: Record<string, string> = {
            '100': '#6b7280', '85': '#e74c3c', '80': '#27ae60', '70': '#e67e22', '65': '#e74c3c',
            '50': '#6b7280', '25': '#6b7280', '120': '#e74c3c', '180': '#e74c3c', '0': '#6b7280'
        };

        const scaleX = (index: number) => padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
        const scaleY = (value: number) => {
            const clampedValue = Math.max(yMin, Math.min(yMax, value));
            return height - padding.bottom - (((clampedValue - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom));
        };

        return (
            <div className="relative">
                <svg
                    ref={svgRef}
                    width="100%"
                    viewBox={`0 0 ${width} ${height}`}
                    className="bg-white rounded-lg"
                >
                    {yAxisCustomMarks.map(label => {
                        const yPos = scaleY(parseInt(label));
                        const labelColor = customLabelColors[parseInt(label)] || '#6b7280';
                        return (
                            <React.Fragment key={label}>
                                <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos} stroke="#e5e7eb" strokeWidth="1" />
                                <text x={width - padding.right + 5} y={yPos + 3} textAnchor="start" fontSize="10" fill={labelColor}>
                                    {label}
                                </text>
                            </React.Fragment>
                        );
                    })}

                    {zones?.map((zone, index) => (
                        <rect key={index} x={padding.left} y={scaleY(zone.max)} width={width - padding.left - padding.right} height={scaleY(zone.min) - scaleY(zone.max)} fill={zone.color} />
                    ))}

                    {dataKeys.map((key, index) => {
                         const linePath = data.map((point, i) => {
                             const value = point[key];
                             if (value === undefined || isNaN(value)) return null;
                             return `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(value)}`;
                         }).filter(Boolean).join(' ');

                        const color = colors[index] || colors[0] || '#333';

                        const lastPointIndex = data.length - 1;
                        const lastValue = data[lastPointIndex]?.[key];
                        const lastX = scaleX(lastPointIndex);
                        const lastY = scaleY(lastValue);

                        return (
                           <React.Fragment key={key}>
                               <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" />
                               {!isNaN(lastValue) && (
                                   <circle cx={lastX} cy={lastY} r={4} fill={color} stroke="white" strokeWidth="1.5" />
                               )}
                           </React.Fragment>
                        );
                    })}

                    {benchmark && <>
                        <line x1={padding.left} y1={scaleY(benchmark)} x2={width - padding.right} y2={scaleY(benchmark)} stroke="#c0392b" strokeWidth="1.5" strokeDasharray="4,4" />
                        <text x={width - padding.right - 5} y={scaleY(benchmark) - 5} textAnchor="end" fontSize="10" fill="#c0392b" fontWeight="bold" className='drop-shadow-sm'>
                            {benchmarkLabel}
                        </text>
                    </>}

                    {data.map((_, i) => {
                        let label = '';
                        if (period === '30d' && (i + 1) % 5 === 0) label = new Date(displayData[i].date).getDate().toString();
                        if (period === '7d') label = new Date(displayData[i].date).toLocaleDateString('en-IN', { weekday: 'short' });
                        if (period === '24h' && i % (12 * 4) === 0) label = new Date(displayData[i].date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                        return <text key={i} x={scaleX(i)} y={height - 10} textAnchor="middle" fontSize="9" fill="#666">{label}</text>;
                    })}
                </svg>
            </div>
        );
    };

    const renderDetails = () => {
        const waitTimeDynamicMax = Math.max(180, Math.ceil(hospital.avgWaitTime_mins * 1.5 / 10) * 10);
        const waitTimeCustomMarks = ["180 mins", "120 mins", "60 mins", "30 mins"].filter(m => parseInt(m) <= waitTimeDynamicMax);

        switch (currentMetric) {
            case 'occupancy':
                return (
                     <div className='grid grid-cols-5 gap-4 items-center'>
                        <div className='col-span-3'>
                            <LineChart
                                data={displayData}
                                dataKeys={["avgOccupancy", "avgICUOccupancy"]}
                                yMax={105}
                                yAxisCustomMarks={['100', '85', '50', '25']}
                                colors={["#3498db", "#e74c3c"]}
                                benchmark={85}
                                benchmarkLabel="Strain"
                                zones={[{ min: 85, max: 105, color: "rgba(231, 76, 60, 0.1)" }, { min: 80, max: 85, color: "rgba(243, 156, 18, 0.1)" }]}
                            />
                        </div>
                        <div className='col-span-2 text-xs text-gray-700 bg-gray-100 p-3 rounded-lg border'>
                             <div className='font-bold mb-2'>Bed Occupancy Rate</div>
                             <p>This metric tracks the percentage of beds that are currently in use.</p>
                             <div className='mt-3 space-y-1'>
                                 <p className="font-bold flex items-center gap-2"><span className='w-3 h-3 rounded-full bg-blue-600'></span>General Beds (Blue)</p>
                                 <p className="font-bold flex items-center gap-2"><span className='w-3 h-3 rounded-full bg-red-600'></span>ICU Beds (Red)</p>
                             </div>
                             <div className='mt-3 space-y-1'>
                                <div><p className="font-bold text-blue-600">IPHS Norm: &lt;80%</p></div>
                                <div><p className="font-bold text-orange-600">Alert Zone: &gt;85%</p></div>
                             </div>
                        </div>
                    </div>
                );
            case 'waitTime':
                return (
                    <div className='grid grid-cols-5 gap-4 items-center'>
                        <div className='col-span-3'>
                            <LineChart
                                data={displayData}
                                dataKeys={["avgWaitTime"]}
                                yMax={waitTimeDynamicMax}
                                yAxisCustomMarks={waitTimeCustomMarks}
                                colors={["#f39c12"]}
                                benchmark={120}
                                benchmarkLabel="Operational Benchmark"
                                zones={[{ min: 120, max: waitTimeDynamicMax, color: "rgba(231, 76, 60, 0.1)" }]}
                            />
                        </div>
                         <div className='col-span-2 text-xs text-gray-700 bg-gray-100 p-3 rounded-lg border'>
                             <div className='font-bold mb-2'>Emergency Department Wait Time</div>
                             <p>Tracks the average time a patient waits in the Emergency Room before being seen.</p>
                             <div className='mt-2'><p className="font-bold text-red-600">Benchmark: 120 mins</p></div>
                        </div>
                    </div>
                );
            case 'fatigue':
                return (
                    <div className='grid grid-cols-5 gap-4 items-center'>
                        <div className='col-span-3'>
                            <LineChart
                                data={displayData}
                                dataKeys={["staffFatigue"]}
                                yMax={100}
                                yAxisCustomMarks={['100', '70', '50', '25']}
                                colors={["#d35400"]}
                                benchmark={70}
                                benchmarkLabel="Critical"
                                zones={[{ min: 70, max: 100, color: "rgba(231, 76, 60, 0.1)" }, { min: 50, max: 70, color: "rgba(243, 156, 18, 0.1)" }]}
                            />
                        </div>
                         <div className='col-span-2 text-xs text-gray-700 bg-gray-100 p-3 rounded-lg border'>
                             <div className='font-bold mb-2'>Staff Duty Load</div>
                             <p>A composite score indicating staff burnout risk. High fatigue can impact quality of care and increase errors.</p>
                             <div className='mt-2 space-y-1'>
                                <div><p className="font-bold text-green-600">Optimal: 0-50%</p></div>
                                <div><p className="font-bold text-yellow-600">Strained: 51-70%</p></div>
                                <div><p className="font-bold text-red-600">Critical: &gt;70%</p></div>
                             </div>
                        </div>
                    </div>
                );
            case 'satisfaction':
                return (
                     <div className='grid grid-cols-5 gap-4 items-center'>
                        <div className='col-span-3'>
                            <LineChart
                                data={displayData}
                                dataKeys={["satisfaction"]}
                                yMax={100}
                                yMin={0}
                                yAxisCustomMarks={['100', '80', '65', '50', '0']}
                                colors={["#8e44ad"]}
                                benchmark={65}
                                benchmarkLabel="NQAS Compliance Alert"
                                zones={[{ min: 0, max: 65, color: "rgba(231, 76, 60, 0.1)" }, { min: 80, max: 100, color: "rgba(46, 204, 113, 0.1)" }]}
                            />
                        </div>
                         <div className='col-span-2 text-xs text-gray-700 bg-gray-100 p-3 rounded-lg border'>
                             <div className='font-bold mb-2'>Patient Experience Score</div>
                             <p>This KPI tracks the quality of care and service interaction. Scores below 65% trigger an immediate alert for NQAS compliance.</p>
                             <div className='mt-2 space-y-1'>
                                <div><p className="font-bold text-green-600">High Quality: &gt;80%</p></div>
                                <div><p className="font-bold text-yellow-600">Compliance Risk: 65-80%</p></div>
                                <div><p className="font-bold text-red-600">Mandatory Audit: &lt;65%</p></div>
                             </div>
                        </div>
                    </div>
                );
            default: return (
                <div className='flex-grow flex items-center justify-center p-8 bg-gray-50 rounded-lg'>
                     <p className='text-gray-500'>This KPI is a direct value and does not have a historical line graph view.</p>
                </div>
            );
        }
    }

    if(!currentMetric) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <CSSTransition nodeRef={modalRef} in={true} appear={true} timeout={300} classNames="dropdown">
                <div ref={modalRef} className="bg-white rounded-lg shadow-2xl w-full max-w-5xl flex flex-col">
                    <div className="flex justify-between items-center p-2 border-b flex-shrink-0">
                        <div className='flex items-center gap-4'>
                            <h2 className={`text-lg font-bold text-gray-800 flex items-center gap-2`} style={{color: config.color}}>
                                <config.icon/> {config.title}
                            </h2>
                        </div>
                         <div className='flex items-center gap-2'>
                            <div className="flex rounded-lg border p-1 bg-gray-100">
                                {(['24h', '7d', '30d'] as HistoricalPeriod[]).map(p => (
                                    <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${period === p ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>
                                        {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><FaTimes /></button>
                         </div>
                    </div>

                    <div className="p-4 flex-grow flex flex-col min-h-0">
                         {isLoading ? (
                            <div className='flex-grow flex items-center justify-center'>
                                <FaSpinner className='animate-spin text-teal-500' size={32} />
                            </div>
                        ) : (
                           renderDetails()
                        )}
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
};

const LogoutScreen = () => (
    <div className="fixed inset-0 bg-slate-800 bg-opacity-90 flex flex-col items-center justify-center z-[200]">
        <FaSpinner className="animate-spin text-white text-4xl" />
        <p className="mt-4 text-white font-semibold">Logging out and clearing session...</p>
    </div>
);


// --- MAIN PORTAL COMPONENT ---

const HospitalPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
    const { liveData, setNodalConfigOverride, mciState } = useContext(StrategicContext);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [activeMenu, setActiveMenu] = useState('Dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [historyMetric, setHistoryMetric] = useState<Metric | null>(null);
    const [toast, setToast] = useState<{message: string | null, type: string | null}>({ message: null, type: null });
    const [isLoading, setIsLoading] = useState(true);
    const [_dataQuality, setDataQuality] = useState(98.7);
    const [syncStatus, setSyncStatus] = useState({ color: 'text-green-400', text: 'Live Feed Established' });

    const [lastCriticalUpdate, setLastCriticalUpdate] = useState(Date.now());
    const [activityFeed, setActivityFeed] = useState<string[]>([]);
    const t = useTranslations();

    const dataQualityRef = useRef(98.7);
    const isAuthenticatedRef = useRef(false);
    isAuthenticatedRef.current = isAuthenticated;
    const initialAlertsRunRef = useRef(false);
    const recurringTimerRef = useRef<NodeJS.Timeout | null>(null);

    const generateVariableETA = useCallback(() => Math.floor(Math.random() * 11) + 5, []);
    const randomInt = useCallback((min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min, []);
    const randomFloat = useCallback((min: number, max: number) => (Math.random() * (max - min) + min).toFixed(1), []);


    const selectedHospital = useMemo(() => liveData.find(h => h.id === HOSPITAL_ID_CONTEXT), [liveData]);

    const showToast = useCallback((message: string, type = 'info') => { setToast({ message, type }); setTimeout(() => setToast({ message: null, type: null }), 4000); }, []);


    const hospitalHistory = useMemo(() => selectedHospital ? generateHospitalHistory(selectedHospital) : [], [selectedHospital]);

    const handleLogout = () => {
        setIsLoggingOut(true);
        setTimeout(() => {
            setIsAuthenticated(false);
            setIsLoggingOut(false);
        }, 1500);
    };

    useEffect(() => {
        const SYNC_INTERVAL = 15000;
        const CONNECTING_DURATION = 3000;

        const syncLoop = setInterval(() => {
            setSyncStatus({ color: 'text-yellow-400', text: 'Connecting to National Grid...' });

            setTimeout(() => {
                setSyncStatus({ color: 'text-green-400', text: 'Live Feed Established' });
                setDataQuality(98 + (Math.random() * 2));
            }, CONNECTING_DURATION);

        }, SYNC_INTERVAL);

        setSyncStatus({ color: 'text-green-400', text: 'Live Feed Established' });

        return () => clearInterval(syncLoop);
    }, []);

    const addActivityFeedEntry = useCallback((message: string, type: string) => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        let colorClass = 'text-gray-600';

        if (type === 'AMBULANCE') {
            colorClass = 'text-red-600 font-semibold';
        } else if (type === 'SYSTEM') {
            colorClass = 'text-blue-500';
        } else if (type === 'MANUAL') {
            colorClass = 'text-teal-600 font-semibold';
        }

        const simpleTime = timestamp.substring(0, 5);
        const coloredPrefix = `<span class="${colorClass}">[${simpleTime}] [${type}]</span>`;

        setActivityFeed(prev => [`${coloredPrefix} ${message}`, ...prev].slice(0, 10));
    }, []);

    useEffect(() => {

        const injectAlert = (type: string, message: string) => {
            if (isAuthenticatedRef.current) {
                addActivityFeedEntry(message, type);
            }
        };

        const setupAlerts = () => {
            if (initialAlertsRunRef.current) return;

            injectAlert('AMBULANCE', `HIGH PRIORITY INBOUND: ETA ${generateVariableETA()} mins. Prepare for Resuscitation.`);
            injectAlert('SYSTEM', 'KPI Validation: Patient Experience Score KPI data stream confirmed stable.');
            injectAlert('SYSTEM', 'Network Alert: Secondary API lag detected, switching to backup endpoint.');

            initialAlertsRunRef.current = true;

            const startRecurringGenerator = () => {
                const alertPool = [
                    { type: 'SYSTEM', message: `CAPACITY WARNING: Regional ICU Occupancy Index at ${randomInt(88, 98)}%. Prepare for transfers.` },
                    { type: 'SYSTEM', message: `OPERATIONAL ALERT: Non-ICU Bed Occupancy Index at ${randomInt(80, 95)}%. Consider holding non-essential admissions.` },
                    { type: 'SYSTEM', message: `PERSONNEL WARNING: Avg Staff Fatigue Score (South) recorded at ${randomInt(60, 75)}%. Risk of clinical error increased.` },
                    { type: 'SYSTEM', message: `OPERATIONAL WARNING: ER Wait Time KPI exceeds ${randomInt(65, 120)} minutes across two districts.` },
                    { type: 'SYSTEM', message: `DATA ALERT: Quality dropped to ${dataQualityRef.current.toFixed(1)}%. Re-verify manual entries.` },
                    { type: 'SYSTEM', message: `OPERATIONAL STATUS: Region-wide discharge rate exceeded ${randomFloat(10, 25)}%. Capacity relief expected soon.` },
                    { type: 'AMBULANCE', message: `URGENT INBOUND: Head/Spinal Trauma. ETA ${generateVariableETA()} mins. Priority-1. Prepare Trauma Team.` },
                    { type: 'AMBULANCE', message: `CRITICAL CARE TRANSFER: Post-operative patient inbound. ETA ${generateVariableETA()} mins. Prepare for ICU bed confirmation.` },
                ];

                const randomIndex = randomInt(0, alertPool.length - 1);
                const randomAlert = alertPool[randomIndex];

                injectAlert(randomAlert.type, randomAlert.message);

                const nextInterval = Math.random() * 60000 + 30000;
                recurringTimerRef.current = setTimeout(startRecurringGenerator, nextInterval);
            };

            recurringTimerRef.current = setTimeout(startRecurringGenerator, 10000);
        };

        if (isAuthenticated) {
            setupAlerts();
        }

        return () => {
            if (recurringTimerRef.current) {
                clearTimeout(recurringTimerRef.current);
            }
        };
    }, [isAuthenticated, addActivityFeedEntry, generateVariableETA, randomInt, randomFloat]);


    useEffect(() => {
        if(selectedHospital) {
            const timer = setTimeout(() => setIsLoading(false), 2500);
            return () => clearTimeout(timer);
        }
    }, [selectedHospital]);


    const handleManualSync = useCallback((formData: any) => {
        setNodalConfigOverride(formData);
        setSyncStatus({ color: 'text-yellow-400', text: 'Connecting to National Grid...' });

        setLastCriticalUpdate(Date.now());
        addActivityFeedEntry("Manual capacity update validated and synced to national server.", 'MANUAL');

        setTimeout(() => {
            setSyncStatus({ color: 'text-green-400', text: 'Live Feed Established' });
        }, 1500);
    }, [setNodalConfigOverride, addActivityFeedEntry]);

    if(isLoggingOut) return <LogoutScreen />;
    if (!isAuthenticated) { return <LoginPage onLogin={() => setIsAuthenticated(true)} t={t} activePortal={activePortal} setActivePortal={setActivePortal} onGoToIntro={onGoToIntro} />; }
    if (isLoading || !selectedHospital) return <div className="flex h-screen items-center justify-center"><FaSpinner className="animate-spin text-teal-600" size={48} /><p className='ml-3 text-lg'>Loading Hospital Data...</p></div>;

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden">
            <HospitalAppHeader selectedHospital={selectedHospital} activePortal={activePortal} setActivePortal={setActivePortal} onLogout={handleLogout} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} onGoToIntro={onGoToIntro} />

            <div className="flex flex-grow overflow-hidden">
                <HospitalSidebar setIsAuthenticated={handleLogout} activeMenu={activeMenu} setActiveMenu={setActiveMenu} isCollapsed={isSidebarCollapsed} syncStatus={syncStatus} />
                <div className="flex flex-grow flex-col">
                    <main className={`flex-grow p-3 bg-gray-200 ${activeMenu === 'Dashboard' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                        {mciState.isActive && mciState.region === selectedHospital.region && (
                            <div className='bg-red-500 text-white font-bold text-center py-2 text-sm rounded-lg mb-4 animate-pulse flex items-center justify-center gap-2'>
                                <FaExclamationTriangle/> {t('hospital.mci.alert')}
                            </div>
                        )}

                        {activeMenu === 'Dashboard' ?
                            <DashboardView hospital={selectedHospital} onCardClick={setHistoryMetric} activityFeed={activityFeed} /> :
                            <ManualReportingView
                                hospital={selectedHospital}
                                setNodalConfigOverride={handleManualSync}
                                auditLog={auditLog}
                                setAuditLog={setAuditLog}
                                showToast={showToast}
                                lastCriticalUpdate={lastCriticalUpdate}
                            />
                        }
                    </main>
                </div>
            </div>
            <footer className="bg-gray-800 text-gray-400 text-[10px] p-1 text-center flex-shrink-0 flex justify-between items-center px-4">
                <span>© 2025 National Bed Occupancy Dashboard. V1.0.0 - Hospital Hub</span>
                <div className="flex items-center gap-4">
                    <span className='text-green-400 font-semibold'>Ping: 85 ms (Aligned)</span>
                    <span>Session IP: 14.102.45.68</span>
                </div>
            </footer>
            {historyMetric && <MetricDetailModal hospital={selectedHospital} historyData={hospitalHistory} metric={historyMetric} onClose={() => setHistoryMetric(null)} />}
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({message: null, type: null})} />
        </div>
    );
};

const LoginPage = ({ onLogin, t, activePortal, setActivePortal, onGoToIntro }: { onLogin: () => void, t: (key: string) => string, activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans">
            <header className="bg-white p-4 shadow-sm border-b flex justify-between items-center flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><FaClinicMedical className="text-teal-600" /> {t('hospital.login.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={onGoToIntro} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors" title="Go to Intro Page">
                        <FaHome />
                    </button>
                    <div className="relative z-40">
                        <button onClick={() => setDropdownOpen(p => !p)} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300">
                            {t(`portal.${activePortal.toLowerCase()}`)} <FaChevronDown size={12} />
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border z-50 w-48 py-1">
                                <p className='text-xs font-semibold text-gray-500 px-3 py-1 border-b'>{t('switch.portal')}</p>
                                {portals.map(p => (
                                    <button key={p} onClick={() => { setActivePortal(p); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${activePortal === p ? 'bg-teal-500 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                                        {t(`portal.${p.toLowerCase()}`)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <div className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border-t-8 border-teal-600 p-6 space-y-4">
                    <div className="text-center">
                        <FaUserMd size={40} className="text-teal-600 mx-auto mb-2" />
                        <h2 className="text-xl font-bold text-gray-800">{t('hospital.login.welcome')}</h2>
                        <p className="text-sm text-gray-500">{t('hospital.login.subtitle')}</p>
                    </div>
                    <input type="text" placeholder="User ID" defaultValue={NODAL_OFFICER_ID} className="w-full p-3 border rounded-lg bg-gray-100" readOnly />
                    <input placeholder="Password" defaultValue="password123" className="w-full p-3 border rounded-lg" type="password" />
                    <button onClick={() => { onLogin(); }} className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700">
                        {t('login.button.authenticate')}
                    </button>
                </div>
            </div>
            <footer className="bg-gray-800 text-gray-400 text-[10px] p-1 text-center flex-shrink-0 flex justify-between items-center px-4">
                <span>© 2025 National Bed Occupancy Dashboard. V1.0.0</span>
                <div className="flex items-center gap-4">
                    <span className='text-green-400 font-semibold'>Ping: 85 ms (Aligned)</span>
                    <span>Session IP: 14.102.45.68</span>
                </div>
            </footer>
        </div>
    );
};

export default HospitalPortal;