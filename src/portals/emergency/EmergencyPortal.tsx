// src/portals/emergency/EmergencyPortal.tsx

import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import type { LiveHospitalData, Portal } from '../../types';
import { useGeolocation, getDistance, getMaxTransferDistance } from '../../utils/helpers_public';
import { FaAmbulance, FaCheckCircle, FaSpinner, FaTimes, FaRoute, FaBell, FaPhone, FaSignOutAlt, FaChevronDown, FaExclamationTriangle, FaTimesCircle, FaMapMarkerAlt, FaHome } from 'react-icons/fa';
import { GlobalContext } from '../../App';
import { useTranslations } from '../../hooks/useTranslations';
import IndianLogo from '../../assets/logo.svg';
import { CSSTransition } from 'react-transition-group';

const PORTAL_MASTER_TITLE = 'SANKAT MOCHAN';
const NOTIFICATION_COOLDOWN_MS = 120000; // 2 minutes (120,000 ms)
const MAX_MISSION_DISTANCE_KM = 75; // Enforce the 'Golden Hour' maximum distance

// Type Definitions
type ActiveMission = {
    id: number,
    name: string,
    address: string,
    type: 'PATIENT_PICKUP' | 'HOSPITAL_TRANSFER',
    pickupEta?: number,
    pickupDist?: number,
    patientCoords: [number, number],
    sourceHospitalId?: number
} | null;

// --- HELPERS ---

// Generate random coordinates near the ambulance
const generateRandomPatientCoordinates = (ambulanceCoords: [number, number]): { coords: [number, number], bearing: string } => {
    const [lat, lon] = ambulanceCoords;

    // Bounding box for Theni-Madurai-Dindigul region
    const minLat = 9.70; const maxLat = 10.40;
    const minLon = 77.25; const maxLon = 78.20;

    let newLat, newLon, distance;

    do {
        const angle = Math.random() * 2 * Math.PI;
        const radius = (Math.random() * (MAX_MISSION_DISTANCE_KM - 5) + 5) / 111;

        newLat = lat + radius * Math.cos(angle);
        newLon = lon + radius * Math.sin(angle);
        distance = getDistance(lat, lon, newLat, newLon);
    } while (
        newLat < minLat || newLat > maxLat ||
        newLon < minLon || newLon > maxLon ||
        distance < 5 || distance > MAX_MISSION_DISTANCE_KM
    );

    const bearing = (newLat > lat ? "North" : "South") + (newLon > lon ? "East" : "West");
    return { coords: [newLat, newLon], bearing };
};

// Assign a tier score (lower score = higher preference)
const getHospitalTier = (hospital: LiveHospitalData): number => {
    const beds = hospital.totalBeds;
    const type = hospital.type;

    if (type.includes('Government (State)') && beds >= 1500) return 1.0; 
    if (type.includes('Private (Large)') && beds >= 1000) return 1.5;     
    if (type.includes('Private (Trust)')) return 2.0;                      
    if (type.includes('Private (Mid-size)')) return 2.5;                   
    if (type.includes('Government (State)')) return 3.0;                   
    if (type.includes('Private (Speciality)')) return 3.5;                 

    return 4.0;
}

// --- SUB-COMPONENTS ---

const Toast = ({ message, type, onClose }: {message: string | null, type: string | null, onClose: () => void}) => {
    if (!message) return null;
    let colorClass = type === 'success' ? "bg-green-600" : type === 'error' ? "bg-red-600" : "bg-blue-600";
    let Icon = type === 'success' ? FaCheckCircle : type === 'error' ? FaTimes : FaExclamationTriangle;
    return ( <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-2xl z-50 flex items-center gap-3 font-semibold text-white ${colorClass}`}> <Icon size={20} /> {message} <button onClick={onClose} className="ml-4 opacity-75 hover:opacity-100"> <FaTimes size={12} /> </button> </div> );
};

const PortalHeader = ({ activePortal, setActivePortal, onLogout, isLoggedIn, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onLogout: () => void, isLoggedIn: boolean, onGoToIntro: () => void }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const t = useTranslations();
    const portals: Portal[] = ['PUBLIC', 'EMERGENCY', 'HOSPITAL', 'STRATEGIC'];

    return (
        <header className="bg-white p-2 text-gray-800 flex items-center justify-between shadow-lg flex-shrink-0 border-b-4 border-red-600">
            <div className="w-48 flex-shrink-0 relative flex items-center gap-2">
                 <button onClick={onGoToIntro} title="Go to Intro Page" className="flex items-center gap-1 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300">
                    <FaHome size={16} />
                </button>
                 <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300">
                    {t(`portal.${activePortal.toLowerCase()}`)} <FaChevronDown size={12} />
                </button>
                {isDropdownOpen && (
                    <div className="absolute left-0 top-12 bg-white rounded-lg shadow-xl border z-50 w-48 py-1">
                        <p className='text-xs font-semibold text-gray-500 px-3 py-1 border-b'>Switch Portal</p>
                        {portals.map(p => (
                            <button key={p} onClick={() => { setActivePortal(p); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${activePortal === p ? 'bg-blue-500 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                                {t(`portal.${p.toLowerCase()}`)}
                            </button>
                        ))}
                    </div>
                )}
                {isLoggedIn && (
                     <button onClick={onLogout} className="flex items-center gap-1 bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300" title="Logout">
                        <FaSignOutAlt size={16} />
                    </button>
                )}
            </div>
            <div className='flex items-center gap-3'>
                <img src={IndianLogo} alt="Logo" className="h-10 w-10"/>
                <h1 className="text-xl sm:text-2xl font-extrabold">{PORTAL_MASTER_TITLE}</h1>
            </div>
             <div className="w-48 flex-shrink-0 flex justify-end">
                {isLoggedIn && (
                    // UPDATED: No shadow/glow, solid red for Control Centre
                    <a href="tel:+91108" className='bg-red-600 text-white font-extrabold flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-red-700 transition-colors'>
                        <FaPhone size={16} /> CONTROL CENTRE
                    </a>
                )}
            </div>
        </header>
    );
};

const PortalFooter = ({ trafficMultiplier }: {trafficMultiplier: number}) => {
    let color = 'text-green-400';
    let statusText = 'Clear';

    // Strict Ranges
    if (trafficMultiplier > 1.55) {
        color = 'text-red-400';
        statusText = 'Heavy';
    } else if (trafficMultiplier > 1.35) {
        color = 'text-yellow-400';
        statusText = 'Moderate';
    }

    const [dateTime, setDateTime] = useState(new Date());

    // UPDATED: Random timer between 10s and 20s
    useEffect(() => {
        let timeoutId: any; // <-- CHANGED from 'number' to 'any' (Fixes TS2322)

        const updateTime = () => {
            setDateTime(new Date());
            // Random delay between 10000ms (10s) and 20000ms (20s)
            const nextUpdate = Math.floor(Math.random() * 10000) + 10000;
            timeoutId = setTimeout(updateTime, nextUpdate);
        };

        // Initial call
        updateTime();

        return () => clearTimeout(timeoutId);
    }, []);

    const formattedTime = dateTime.toLocaleTimeString();

    return(
        <footer className="bg-gray-800 text-gray-400 text-[10px] p-1 text-center flex-shrink-0 flex justify-between items-center px-4">
            <span>© 2025 {PORTAL_MASTER_TITLE}. V1.0.0</span>
            <div className='flex items-center gap-4'>
                <span className={`font-bold ${color}`}>Live Traffic: {trafficMultiplier.toFixed(2)}x ({statusText})</span>
                <span className='font-semibold text-white'>Updated: {formattedTime}</span>
            </div>
            <span className='font-semibold text-white'>GOVERNMENT OF INDIA</span>
        </footer>
    )
};

const CancellationReasonModal = ({ onClose, onSubmit }: {onClose: () => void, onSubmit: (reason: string) => void}) => {
    const [reason, setReason] = useState('');
    const reasons = ["Patient Refused Transfer", "Incorrect Callout/False Alarm", "Transport Safety Concerns", "Mechanical Failure", "Scene Unsafe"];

    return (
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col">
             <div className="p-4 bg-red-700 text-white border-b border-red-800 flex justify-between items-center rounded-t-xl">
                <h2 className="text-xl font-bold flex items-center gap-2"><FaTimesCircle/> Report Cancellation</h2>
                <button onClick={() => onClose()}><FaTimes size={16} /></button>
            </div>
            <div className='p-4 space-y-3'>
                <p className='font-semibold text-gray-700'>Select or input the primary reason for mission cancellation:</p>
                <div className='grid grid-cols-2 gap-2'>
                    {reasons.map(r => (
                        <button key={r} onClick={() => setReason(r)} className={`p-2 border rounded-lg text-sm transition-colors ${reason === r ? 'bg-red-100 border-red-500 text-red-700 font-bold' : 'bg-gray-50 hover:bg-gray-100'}`}>{r}</button>
                    ))}
                </div>
                 <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter other reason or confirm selection..."
                    className="w-full p-2 border rounded-lg h-24 text-sm"
                />
                 <button onClick={() => onSubmit(reason)} disabled={!reason} className={`w-full py-3 rounded-lg text-lg font-bold ${!reason ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                    Submit & Cancel Mission
                 </button>
            </div>
        </div>
    );
};

const LocationAcquiringScreen = () => {
    return (
        <div className="fixed inset-0 bg-slate-800 flex flex-col items-center justify-center z-50">
            <div className="gps-pulse p-4">
                <FaMapMarkerAlt className="text-red-500 text-5xl"/>
            </div>
            <p className="mt-4 text-white font-semibold flex items-center gap-2">
                <FaSpinner className="animate-spin text-white" size={16}/> Acquiring GPS Signal...
            </p>
        </div>
    );
};


// --- MAIN COMPONENT ---
const EmergencyPortal = ({ activePortal, setActivePortal, onGoToIntro }: { activePortal: Portal, setActivePortal: (p: Portal) => void, onGoToIntro: () => void }) => {
    const { liveData, addGroundFeedback, groundFeedback, setAmbulanceAlert, setGroundFeedback: setGlobalGroundFeedback } = useContext(GlobalContext);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Local Traffic Simulation (Average 1.4x)
    const [localTrafficMultiplier, setLocalTrafficMultiplier] = useState(1.50);

    const [missionPhase, setMissionPhase] = useState<'AWAITING_MISSION' | 'EN_ROUTE_TO_PATIENT' | 'AWAITING_HOSPITAL_SELECTION' | 'EN_ROUTE_TO_HOSPITAL' | 'MISSION_COMPLETE'>('AWAITING_MISSION');
    const [activeMission, setActiveMission] = useState<ActiveMission>(null); 
    const [recommendedHospital, setRecommendedHospital] = useState<LiveHospitalData | null>(null);
    const [isPatientCritical, setIsPatientCritical] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [toast, setToast] = useState<{message: string | null, type: string | null}>({ message: null, type: null });
    const [isOnCooldown, setIsOnCooldown] = useState(false);
    const [notifiedHospitals, setNotifiedHospitals] = useState<{[hospitalId: number]: number}>({});
    const [showCancelModal, setShowCancelModal] = useState(false);

    const modalRef = useRef(null);
    const t = useTranslations();

    // Helper: 45km/h base speed
    const calculateEmergencyETA = (distanceKm: number, multiplier: number) => {
        const baseSpeed = 45; 
        const baseTimeMinutes = (distanceKm / baseSpeed) * 60;
        return baseTimeMinutes * multiplier;
    };

    // Traffic Simulation Effect
    useEffect(() => {
        const interval = setInterval(() => {
            setLocalTrafficMultiplier(prev => {
                const jitter = (Math.random() * 0.1) - 0.05; 
                const centering = (1.5 - prev) * 0.1;
                let next = prev + jitter + centering;
                if (next < 1.2) next = 1.2;
                if (next > 1.7) next = 1.7;
                return next;
            });
        }, 5000); 
        return () => clearInterval(interval);
    }, []);

    const simulationDuration = useMemo(() => {
        if (missionPhase !== 'EN_ROUTE_TO_HOSPITAL' || !recommendedHospital) return 60; 
        const eta = calculateEmergencyETA(recommendedHospital.distance!, localTrafficMultiplier);
        return Math.max(45, Math.min(90, eta * 0.75));
    }, [missionPhase, recommendedHospital, localTrafficMultiplier]);

    const { location: userLocation } = useGeolocation(
        'emergency',
        missionPhase,
        missionPhase === 'EN_ROUTE_TO_HOSPITAL' ? recommendedHospital?.coords : activeMission?.patientCoords,
        missionPhase === 'EN_ROUTE_TO_PATIENT' || missionPhase === 'EN_ROUTE_TO_HOSPITAL',
        simulationDuration
    );

    const showToast = (message: string, type = 'info') => { setToast({ message, type }); setTimeout(() => setToast({ message: null, type: null }), 4000); };

    useEffect(() => {
        if (isLoggedIn && missionPhase === 'AWAITING_MISSION' && !activeMission && !isOnCooldown && Math.random() < 0.85 && userLocation) {
            const isPatientPickup = Math.random() < 0.7;

            if (isPatientPickup) {
                const { coords: patientCoords, bearing } = generateRandomPatientCoordinates(userLocation);
                const pickupDist = getDistance(userLocation[0], userLocation[1], patientCoords[0], patientCoords[1]);
                const pickupEta = calculateEmergencyETA(pickupDist, localTrafficMultiplier);

                setActiveMission({
                    id: Date.now(),
                    name: "Emergency Call (Patient Pickup)",
                    address: `Rural Area - ${bearing} Division`,
                    type: 'PATIENT_PICKUP',
                    pickupDist: pickupDist,
                    pickupEta: pickupEta,
                    patientCoords: patientCoords
                });
            } else {
                const targetDistricts = ['Theni', 'Madurai', 'Dindigul'];
                const localHospitals = liveData.filter(h => targetDistricts.some(district => h.address.includes(district)));

                if (localHospitals.length >= 2) {
                    const sourceHospitals = localHospitals.filter(h => h.id === 150 || (h.type.toLowerCase().includes('government (state)') && h.totalBeds < 1000));

                    if (sourceHospitals.length > 0) {
                        let origin = sourceHospitals[Math.floor(Math.random() * sourceHospitals.length)];

                         const pickupDist = getDistance(userLocation[0], userLocation[1], origin.coords[0], origin.coords[1]);
                         const pickupEta = calculateEmergencyETA(pickupDist, localTrafficMultiplier);

                         setActiveMission({
                            id: Date.now(),
                            name: "Hospital Transfer Request",
                            address: `From: ${origin.name}`,
                            type: 'HOSPITAL_TRANSFER',
                            pickupDist: pickupDist,
                            pickupEta: pickupEta,
                            patientCoords: origin.coords,
                            sourceHospitalId: origin.id
                        });
                    }
                }
            }
        }
    }, [isLoggedIn, missionPhase, activeMission, liveData, localTrafficMultiplier, userLocation, isOnCooldown]);

    useEffect(() => {
        const cleanup = setInterval(() => {
            setNotifiedHospitals(prev => {
                const now = Date.now();
                const newNotified = { ...prev };
                for (const id in newNotified) {
                    if (now - newNotified[id] > NOTIFICATION_COOLDOWN_MS) {
                        delete newNotified[id];
                    }
                }
                return newNotified;
            });
        }, 60000); 
        return () => clearInterval(cleanup);
    }, []);

    const handleLogout = () => {
        if (missionPhase !== 'AWAITING_MISSION') {
            alert("LOGOUT BLOCKED: A mission is currently active. Please complete or formally cancel the mission before logging out to prevent data data loss.");
            return;
        }

        if (window.confirm("LOGOUT: No active mission found. Are you sure you want to log out and clear the terminal session?")) {
            setIsLoggedIn(false);
            setActiveMission(null);
            setRecommendedHospital(null);
            setMissionPhase('AWAITING_MISSION');
            setIsPatientCritical(false);
            setIsNotifying(false);
            setNotifiedHospitals({});
        }
    };


    const handleAcceptMission = () => {
        addGroundFeedback("Mission Accepted. En route to patient pickup.");
        alert(`Coordinates loaded. Diverting to navigation app for pickup at ${activeMission?.address}.`);
        setMissionPhase('EN_ROUTE_TO_PATIENT');
    };

    const handlePatientOnboard = () => {
        setIsCalculating(true);
        addGroundFeedback(`Patient onboard. Initiating optimal route calculation...`);

        setTimeout(() => {
            setIsCalculating(false);

            const patientLocation = activeMission!.patientCoords;
            const sourceHospitalId = activeMission?.sourceHospitalId;
            const targetDistricts = ['Theni', 'Madurai', 'Dindigul'];

            const hospitals = liveData
                .filter(h => targetDistricts.some(district => h.address.includes(district)))
                .filter(h => h.id !== sourceHospitalId)
                .map(h => ({
                    ...h,
                    distance: getDistance(patientLocation[0], patientLocation[1], h.coords[0], h.coords[1]),
                    tier: getHospitalTier(h) 
                }))
                .filter(h => h.distance! <= getMaxTransferDistance() && h.bedStatus !== 'Critical');

            hospitals.sort((a,b) => {
                if(isPatientCritical) {
                    const tierDifference = a.tier - b.tier;
                    if(tierDifference !== 0) return tierDifference;
                    const icuDifference = b.availableICUBeds - a.availableICUBeds;
                    if(icuDifference !== 0) return icuDifference;
                    return a.distance! - b.distance!;
                }
                return a.distance! - b.distance!;
            });

            if (hospitals.length > 0) {
                setRecommendedHospital(hospitals[0]);
                setMissionPhase('AWAITING_HOSPITAL_SELECTION');
            } else {
                addGroundFeedback("CRITICAL: No suitable hospitals found within range.");
                alert("CRITICAL: No suitable hospitals found. Contact Control Center!");
            }

        }, 3000);
    };

    const handleNotifyHospital = () => {
        setIsNotifying(true);
        const hospital = recommendedHospital!;
        const eta = calculateEmergencyETA(hospital.distance!, localTrafficMultiplier);

        setAmbulanceAlert({
            eta: Math.round(eta),
            isCritical: isPatientCritical,
            hospitalName: hospital.name,
            timestamp: Date.now()
        });

        setNotifiedHospitals(prev => ({ ...prev, [hospital.id]: Date.now() }));

        addGroundFeedback(`Pre-alert sent to ${hospital.name}. Awaiting acknowledgement.`);
        
        setTimeout(() => {
            addGroundFeedback(`**HOSPITAL ACKNOWLEDGED**: ${hospital.name} is preparing for arrival.`);
        }, 2500);

        setTimeout(() => setIsNotifying(false), 5000);
    };

    const handleSelectAndConfirmHospital = () => {
        alert(`Transfer to ${recommendedHospital!.name} confirmed. Proceeding to destination.`);
        addGroundFeedback(`Transfer to ${recommendedHospital!.name} confirmed and initiated.`);
        setMissionPhase('EN_ROUTE_TO_HOSPITAL');
    };

    const handleNavigate = () => {
        alert(`Handing off to external navigation app. Destination: ${recommendedHospital!.name}`);
    }

    const handleCancelMissionSubmit = (reason: string) => {
        const fullReason = `Reason: ${reason}. Notifying Ops Center.`;

        if (reason === "Mechanical Failure") {
            addGroundFeedback("CRITICAL: Mission cancelled due to Mechanical Failure.");
            addGroundFeedback("Entering 30-second maintenance cooldown.");
            setIsOnCooldown(true);

            setTimeout(() => {
                setIsOnCooldown(false);
                addGroundFeedback("Maintenance check complete. System back online. Awaiting new missions.");
                setGlobalGroundFeedback(['Fresh log started after maintenance.']);
            }, 30000);
        }

        handleCancelMission(fullReason);
        showToast('Mission cancellation reported to Control Centre.', 'error');
    };

    const handleCancelMission = (reason: string) => {
        addGroundFeedback(`Mission Canceled. ${reason}`);
        setActiveMission(null);
        setRecommendedHospital(null);
        setMissionPhase('AWAITING_MISSION');
        setShowCancelModal(false);
        setIsNotifying(false);
        setIsPatientCritical(false);
    };

    const handleCompleteMission = () => {
        addGroundFeedback(`Mission Completed. Destination: ${recommendedHospital?.name || 'N/A'}`);
        showToast('Mission Completed and data saved.', 'success');
        setMissionPhase('MISSION_COMPLETE');
        setIsNotifying(false);
        setTimeout(() => {
           setActiveMission(null);
           setRecommendedHospital(null);
           setMissionPhase('AWAITING_MISSION');
           setIsPatientCritical(false);
       }, 5000);
    };

    const renderMainContent = () => {
        if (isOnCooldown) {
            return (
                <div className="text-center flex flex-col items-center">
                    <FaSpinner size={80} className="text-yellow-500 animate-spin" />
                    <h2 className="text-3xl font-bold text-yellow-600 mt-4">Standby (Maintenance Check)</h2>
                    <p className="text-gray-500">Temporarily offline for vehicle diagnostics.</p>
                </div>
            );
        }

        switch (missionPhase) {
            case 'EN_ROUTE_TO_HOSPITAL':
                if (!recommendedHospital) return null;
                 return (
                    <div className="text-center">
                         <div className="bg-gray-50 p-6 rounded-lg shadow-lg border w-full max-w-2xl text-center">
                            <h2 className="text-xl font-bold text-gray-500 uppercase">Current Status</h2>
                            <p className="text-3xl font-bold text-gray-800 mt-2">IN TRANSFER</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase mt-1">To: {recommendedHospital!.name}</p>

                            <div className="w-full bg-gray-300 rounded-lg h-6 mt-6 relative overflow-hidden border-2 border-gray-400">
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">TRANSFER PROGRESS</div>

                                <div className="absolute top-0 left-0 h-full bg-blue-500 moving-bar rounded-lg" style={{ animationDuration: `${simulationDuration}s` }}></div>

                                <div className="absolute h-full top-0 text-3xl moving-ambulance" style={{ animationDuration: `${simulationDuration}s`, animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}>
                                    <FaAmbulance className='text-red-600' size={24} />
                                </div>
                            </div>
                            <p className='mt-2 text-sm text-gray-500'>*Simulation: Visual progress only.</p>
                        </div>
                    </div>
                );
            case 'MISSION_COMPLETE':
                if (!recommendedHospital) return null;
                return (
                    <div className="text-center flex flex-col items-center">
                        <FaCheckCircle size={80} className="text-green-500" />
                        <h2 className="text-4xl font-bold text-gray-800 mt-4">Mission Complete</h2>
                    </div>
                );
             case 'AWAITING_HOSPITAL_SELECTION':
                if(isCalculating) return (
                    <div className="text-center flex flex-col items-center">
                        <FaSpinner size={48} className="animate-spin text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-600 mt-4">Calculating Optimal Destination...</h2>
                    </div>
                );
                
                const rawEta = calculateEmergencyETA(recommendedHospital!.distance!, localTrafficMultiplier);

                let trafficColor = 'text-green-600';
                let trafficLabel = 'Clear';
                let TrafficIcon = FaCheckCircle;
            
                if (localTrafficMultiplier > 1.55) {
                    trafficColor = 'text-red-600';
                    trafficLabel = 'Heavy Traffic';
                    TrafficIcon = FaExclamationTriangle;
                } else if (localTrafficMultiplier > 1.35) {
                    trafficColor = 'text-yellow-600';
                    trafficLabel = 'Moderate Traffic';
                    TrafficIcon = FaRoute;
                }

                return (
                     <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-800">System Recommendation</h2>
                        {recommendedHospital && (
                            <>
                             <p className="text-4xl font-extrabold text-green-600 mt-2">{recommendedHospital.name}</p>
                             
                             <div className="flex flex-col items-center gap-1 mt-2">
                                <p className="text-xl text-gray-700 font-bold">
                                    ~{rawEta.toFixed(0)} min ETA 
                                    <span className="font-normal text-gray-500 text-lg mx-2">|</span> 
                                    {recommendedHospital.availableBeds.toFixed(0)} Beds 
                                    <span className="font-normal text-gray-500 text-lg mx-2">|</span> 
                                    {recommendedHospital.availableICUBeds.toFixed(0)} ICU
                                </p>
                                
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border ${trafficColor} border-gray-200 shadow-sm mt-1`}>
                                    <TrafficIcon size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {trafficLabel} ({localTrafficMultiplier.toFixed(2)}x)
                                    </span>
                                </div>
                             </div>
                            </>
                        )}
                    </div>
                );
             case 'EN_ROUTE_TO_PATIENT':
                return (
                     <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-800">Proceed to Patient Pickup</h2>
                        {activeMission && (
                             <p className="text-xl text-gray-500 mt-2 font-semibold">
                                {activeMission.address.startsWith("From") ? '' : 'To: '}
                                {activeMission.address}
                            </p>
                        )}
                         <div className='flex justify-center mt-8'>
                            <div className='flex items-center gap-2 gps-pulse bg-red-600 text-white p-3 rounded-full'>
                                <FaAmbulance size={20}/> EN ROUTE
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="text-center flex flex-col items-center">
                        <FaAmbulance size={80} className="text-gray-300" />
                        <h2 className="text-3xl font-bold text-gray-400 mt-4">Standby for Missions</h2>
                    </div>
                );
        }
    };

    const renderActionPanel = () => {
        const canNotify = recommendedHospital && notifiedHospitals[recommendedHospital.id] === undefined;

        switch (missionPhase) {
            case 'EN_ROUTE_TO_PATIENT':
                return (
                    <button
                        onClick={handlePatientOnboard}
                        disabled={isCalculating}
                        className={`font-bold py-3 px-6 rounded-lg text-2xl shadow-lg w-full ${isCalculating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isCalculating ? 'PROCESSING...' : 'ARRIVED / PATIENT ONBOARD'}
                    </button>
                );
            case 'AWAITING_HOSPITAL_SELECTION':
                 return (
                    <div className='w-full space-y-3'>
                        <div className="bg-yellow-100 p-2 rounded-lg text-center">
                            <label className="font-bold text-yellow-800 flex items-center justify-center gap-1.5 text-sm">
                                <input type="checkbox" checked={isPatientCritical} onChange={() => setIsPatientCritical(p => !p)} className="h-4 w-4"/>
                                CRITICAL (ICU REQUIRED)
                            </label>
                            <button onClick={isCalculating ? undefined : handlePatientOnboard} disabled={isCalculating} className={`text-xs font-bold mt-1 hover:underline flex items-center justify-center w-full ${isCalculating ? 'text-gray-500 cursor-not-allowed' : 'text-blue-600'}`}>
                                {isCalculating ? <><FaSpinner className='animate-spin mr-1'/> RE-CALCULATING...</> : 'RE-CALCULATE OPTIMAL ROUTE'}
                            </button>
                        </div>
                        <button onClick={handleNotifyHospital} disabled={!canNotify || isNotifying || isCalculating} className={`font-bold py-3 px-6 rounded-lg text-lg w-full ${(!canNotify || isNotifying || isCalculating) ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                            {!canNotify ? 'HOSPITAL NOTIFIED (COOLDOWN)' : isNotifying ? 'SENDING PRE-ALERT...' : 'NOTIFY HOSPITAL (PRE-ALERT)'}
                        </button>
                        <button onClick={handleSelectAndConfirmHospital} disabled={isCalculating} className={`font-bold py-4 px-8 rounded-lg text-2xl shadow-lg w-full ${isCalculating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>CONFIRM & START TRANSFER</button>
                    </div>
                 );
            case 'EN_ROUTE_TO_HOSPITAL':
                const currentDistance = recommendedHospital && userLocation ? getDistance(userLocation[0], userLocation[1], recommendedHospital.coords[0], recommendedHospital.coords[1]) : 100;

                return (
                    <div className="space-y-4 w-full">
                        <button onClick={handleNavigate} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-base w-full flex items-center justify-center gap-2"><FaRoute/> Navigate</button>
                        
                        {/* UPDATED: Teal Color for Medical/Helpline Button */}
                        <a href={`tel:${recommendedHospital!.helpline}`} className="bg-teal-100 text-teal-800 font-bold py-2 px-4 rounded-lg text-base w-full flex items-center justify-center gap-2 hover:bg-teal-200 transition-colors">
                            <FaPhone/> Hospital Helpline
                        </a>

                        <button onClick={() => setShowCancelModal(true)} className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg text-base w-full flex items-center justify-center gap-2"><FaTimes/> Cancel Mission</button>
                        <button onClick={handleCompleteMission} disabled={currentDistance > 1} className={`font-bold py-2 px-4 rounded-lg text-base w-full ${currentDistance > 1 ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}><FaCheckCircle/> Mission Complete</button>
                    </div>
                );
            default:
                return null;
        }
    }


    if (!isLoggedIn) {
        return (
            <div className="flex flex-col h-screen bg-slate-100 font-sans">
                <PortalHeader activePortal={activePortal} setActivePortal={setActivePortal} onLogout={handleLogout} isLoggedIn={isLoggedIn} onGoToIntro={onGoToIntro} />
                <div className="flex-grow flex items-center justify-center py-2">
                    <div className="w-full max-w-xs bg-white rounded-xl shadow-2xl border-t-8 border-red-600">
                        <div className="text-center p-3 flex flex-col items-center">
                            <FaAmbulance size={28} className="text-red-600 mx-auto" />
                            <h1 className="text-lg font-extrabold text-gray-800 mt-1">Welcome Back, Crew Member</h1>
                            <p className="text-xs text-gray-500 mt-0.5">Ambulance Dispatch Terminal</p>
                        </div>
                         <div className='p-3 space-y-3'>
                            <input type="text" placeholder="Ambulance ID / Badge No." className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500" />
                            <input type="password" placeholder="Password" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500" />
                            <button onClick={() => setIsLoggedIn(true)} className="w-full bg-red-600 font-bold py-3 rounded-lg text-white hover:bg-red-700">
                                <FaSignOutAlt className='inline mr-2'/> {t('login.button.authenticate')}
                            </button>
                            <p className='text-xs text-gray-500 text-center'>{t('login.help.text')}</p>
                            <a href="tel:+91108" className='block w-full text-center bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-700'><FaPhone className='inline mr-2'/> CONTACT CONTROL</a>
                        </div>
                    </div>
                </div>
                {/* NEW: Use local traffic logic even in login screen (simulated with 1.5 default) */}
                <PortalFooter trafficMultiplier={1.5} />
            </div>
        );
    }

    if (!userLocation) {
        return <LocationAcquiringScreen />;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden">
            <PortalHeader activePortal={activePortal} setActivePortal={setActivePortal} onLogout={handleLogout} isLoggedIn={isLoggedIn} onGoToIntro={onGoToIntro} />

            <main className={`flex-grow p-3 flex flex-col space-y-3 overflow-hidden transition-all duration-300 ${showCancelModal ? 'blur-sm grayscale opacity-50' : ''}`}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0">
                    
                    {/* Left Status Bar: Handles Mechanical Failure Red State */}
                    <div className={`p-2 rounded-lg shadow-lg text-white text-center flex flex-col justify-center items-center ${isOnCooldown ? 'bg-red-800' : 'bg-gray-800'}`}>
                        <h2 className="text-xs font-bold text-gray-400 uppercase">Current Status</h2>
                        <div className="text-xl font-bold truncate w-full">
                            {isOnCooldown ? "TEMPORARILY OFFLINE" : missionPhase.replace(/_/g, ' ')}
                        </div>
                    </div>

                    {/* Right Status Bar: No Glow on Box, but Glow on Text */}
                    <div className="bg-white p-2 rounded-lg shadow-lg flex flex-col justify-center items-center">
                         {isOnCooldown ? (
                            <>
                                <h2 className="text-xs font-bold text-red-500 uppercase">SYSTEM ALERT</h2>
                                <div className="text-xl font-bold text-red-700">MECHANICAL FAILURE</div>
                            </>
                         ) : (
                            <>
                                {/* UPDATED: Mission Active Text has Glow and larger size */}
                                <h2 className={`font-bold uppercase ${missionPhase !== 'AWAITING_MISSION' ? 'text-green-600 text-sm animate-pulse drop-shadow-[0_0_5px_rgba(22,163,74,0.5)]' : 'text-xs text-gray-400'}`}>
                                     {missionPhase !== 'AWAITING_MISSION' ? 'MISSION ACTIVE' : 'MISSION CONTROL'}
                                </h2>
                                
                                {activeMission && missionPhase === 'AWAITING_MISSION' ? (
                                    <div className="w-full bg-red-700 p-2 rounded-lg shadow-2xl animate-pulse text-white text-center">
                                        <p className="text-md font-bold flex items-center justify-center gap-2"><FaBell className='text-yellow-400' /> NEW MISSION</p>
                                        <p className="text-sm truncate mt-1">**{activeMission.name.toUpperCase()}:** {activeMission.address}</p>
                                        {activeMission.pickupEta && (<p className="font-bold text-yellow-300">Pickup ETA: ~{activeMission.pickupEta.toFixed(0)} min ({activeMission.pickupDist!.toFixed(1)} km)</p>)}
                                        <div className='flex gap-2 mt-2'>
                                            <button onClick={() => { setActiveMission(null); addGroundFeedback("Mission Declined by Crew.")} } className='flex-1 bg-gray-600 font-bold py-2 rounded-lg text-sm'>DECLINE</button>
                                            <button onClick={handleAcceptMission} className='flex-1 bg-green-600 font-bold py-2 rounded-lg text-sm'>ACCEPT</button>
                                        </div>
                                    </div>
                                ) : (
                                   missionPhase === 'AWAITING_MISSION' && <div className="text-gray-400 font-semibold text-lg">AWAITING MISSION ASSIGNMENT</div>
                                )}
                            </>
                         )}
                    </div>
                </div>

                <div className="flex-grow bg-white rounded-lg shadow-inner flex flex-col md:flex-row relative overflow-hidden p-4 gap-4 overflow-y-auto md:overflow-y-hidden">
                    <div className="w-full md:w-1/4 flex flex-col order-2 md:order-1">
                        <h3 className="text-lg font-bold text-gray-700 mb-2 text-center">Mission Log</h3>
                        <div className="flex-grow bg-gray-100 p-2 rounded-lg overflow-y-auto text-xs space-y-1">
                            {groundFeedback.map((msg, i) => <p key={i} className="border-b pb-1">{msg}</p>)}
                        </div>
                    </div>
                    <div className="flex-grow flex items-center justify-center min-h-[300px] order-1 md:order-2">
                        {renderMainContent()}
                    </div>
                    <div className="w-full md:w-1/4 flex flex-col items-center justify-center order-3">
                        {renderActionPanel()}
                    </div>
                </div>
            </main>

            <PortalFooter trafficMultiplier={localTrafficMultiplier}/>

            <CSSTransition nodeRef={modalRef} in={showCancelModal} timeout={300} classNames="dropdown" unmountOnExit>
                 <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
                    <CancellationReasonModal onClose={() => setShowCancelModal(false)} onSubmit={handleCancelMissionSubmit} />
                 </div>
            </CSSTransition>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: null })} />
        </div>
    );
};
export default EmergencyPortal;