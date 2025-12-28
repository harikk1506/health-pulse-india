// src/utils/simulationEngine.ts

import type { Hospital, LiveHospitalData, MciState, NodalConfig, HistoricalStat } from '../types';
import originalHospitalData from '../data/hospitals.json';

// --- HYPER-DYNAMIC CONFIGURATION ---
// VERDICT: Kept at 4.0 to maintain "Live Pulse" feel for National Overview
const MAX_BED_CHANGE_PER_HOUR = 4.0;
const MAX_FATIGUE_CHANGE = 1.5;
const MAX_SATISFACTION_CHANGE = 2.0;
const PPE_LEVELS: Hospital['ppe_stock_level'][] = ['Good', 'Low', 'Critical', 'Stockout'];

// --- ENGINE STATE ---
let strategicLiveData: LiveHospitalData[] = [];
let nationalHistory: HistoricalStat[] = [];
let mciState: MciState = { isActive: false, region: null };
let nodalConfigOverride: NodalConfig | null = null;
let subscribers: ((data: { liveData: LiveHospitalData[], history: HistoricalStat[] }) => void)[] = [];
let isInitialized = false;
let dynamicHighStrainIds: number[] = []; 

// Cache hospital IDs by sector for efficient random selection
const publicHospitalIds = originalHospitalData
    .filter(h => h.type.toLowerCase().includes('government'))
    .map(h => h.id);

const privateHospitalIds = originalHospitalData
    .filter(h => !h.type.toLowerCase().includes('government'))
    .map(h => h.id);

// --- SIMULATION LOGIC ---

const initializeSimulation = (hospital: Hospital): LiveHospitalData => {
    const isPublic = hospital.type.toLowerCase().includes('government');
    
    // Initial Setup: Set to the new "Resting Baselines"
    // Public: ~65% | Private: ~55%
    let baseOccupancy;
    if (hospital.id === 150) {
        baseOccupancy = 75;
    } else if (isPublic) {
        baseOccupancy = 65 + (Math.random() * 6 - 3); 
    } else {
        baseOccupancy = 55 + (Math.random() * 6 - 3); 
    }
    baseOccupancy = Math.min(baseOccupancy, 96);

    const occupiedBeds = (baseOccupancy / 100) * hospital.totalBeds;
    const bedOccupancy = (occupiedBeds / hospital.totalBeds) * 100;
    
    // Initialize ICU near General Occupancy
    const icuBaseOccupancy = bedOccupancy + (Math.random() * 10 - 5);
    const occupiedICUBeds = (icuBaseOccupancy / 100) * hospital.totalICU;
    const icuBedOccupancy = hospital.totalICU > 0 ? (occupiedICUBeds / hospital.totalICU) * 100 : 0;
    
    let staffFatigue = 61 + (Math.random() - 0.5) * 5;
    let patientSatisfaction_pct = 71 + (Math.random() - 0.5) * 5;
    let currentWaitTime = hospital.avgWaitTime_mins * (1 + (bedOccupancy - 75) / 100);

    if (hospital.id === 150) {
        staffFatigue = 70.0;
        patientSatisfaction_pct = 68.0;
        currentWaitTime = 120.0;
    }

    return {
        ...hospital,
        occupiedBeds,
        occupiedICUBeds,
        availableBeds: hospital.totalBeds - occupiedBeds,
        availableICUBeds: hospital.totalICU - occupiedICUBeds,
        bedOccupancy,
        icuBedOccupancy: Math.min(100, icuBedOccupancy),
        bedStatus: bedOccupancy > 95 ? 'Critical' : bedOccupancy > 80 ? 'High Occupancy' : 'Available',
        currentWaitTime,
        staffFatigue_score: Math.max(10, Math.min(100, staffFatigue)),
        patientSatisfaction_pct: Math.max(30, Math.min(90, patientSatisfaction_pct))
    };
};

const updateLiveMetrics = (hospital: LiveHospitalData): LiveHospitalData => {
    let { totalBeds, totalICU, oxygen_supply_days, ppe_stock_level } = hospital;
    
    if (nodalConfigOverride && hospital.id === nodalConfigOverride.hospitalId && Date.now() < nodalConfigOverride.activeUntil) {
        totalBeds = nodalConfigOverride.totalBeds;
        totalICU = nodalConfigOverride.totalICU;
        oxygen_supply_days = nodalConfigOverride.oxygen_supply_days;
    }

    const dynamicALOS = hospital.ALOS_days + (Math.random() - 0.5) * 0.2;
    const baseDischargeRate = (hospital.occupiedBeds / dynamicALOS) / 24;
    const baseAdmissionRate = (hospital.EDThroughput_perDay / 24) * 0.24;
    
    // --- 1. SHOCK LOGIC ---
    const isHighStrain = dynamicHighStrainIds.includes(hospital.id);
    const randomShock = isHighStrain ? 10.0 : 9.0; 
    let netBedChangeRaw = baseDischargeRate - baseAdmissionRate + ((Math.random() - 0.5) * randomShock);

    const isInMciRegion = mciState.isActive && mciState.region === hospital.region;
    if (isInMciRegion) netBedChangeRaw -= 3; 

    let netBedChange = Math.min(Math.abs(netBedChangeRaw), MAX_BED_CHANGE_PER_HOUR) * Math.sign(netBedChangeRaw);
    let occupiedBeds = Math.max(5, Math.min(totalBeds, hospital.occupiedBeds - netBedChange));

    // --- 2. BASELINE & TARGET LOGIC (Rubber Band Logic) ---
    const isPublic = hospital.type.toLowerCase().includes('government');
    let baselineOccupancy;

    if (hospital.id === 150) {
        baselineOccupancy = 75; 
    } else if (isPublic) {
        // Public: High Target -> 93% (Hit Red Zone) | Resting -> 65% (Avg ~72%)
        baselineOccupancy = isHighStrain ? 93 : 65;
    } else {
        // Private: High Target -> 89% (Hit Red Zone) | Resting -> 55% (Avg ~62%)
        baselineOccupancy = isHighStrain ? 89 : 55;
    }
    
    // --- 3. DRIFT MECHANICS (The "Rubber Band") ---
    const currentOccupancy = (occupiedBeds / totalBeds) * 100;
    let driftFactor;

    if (isHighStrain) {
        // CLIMB: Fast (0.4) to snap to attention - Matches your preference for visual speed
        driftFactor = 0.4; 
    } else if (currentOccupancy > baselineOccupancy) {
        // RELEASE: Gentle but efficient (0.12)
        driftFactor = 0.12; 
    } else {
        // RECOVERY: Standard fill (0.1)
        driftFactor = 0.1;
    }

    const drift = (baselineOccupancy - currentOccupancy) * driftFactor;
    occupiedBeds += (drift / 100) * totalBeds;
    occupiedBeds = Math.max(5, Math.min(totalBeds, occupiedBeds));

    // --- ICU LOGIC (FIXED: Added Target Logic to prevent "Freeing Up") ---
    let occupiedICUBeds = hospital.occupiedICUBeds;
    let icuBaseline;
    
    if (hospital.id === 150) {
        // SPECIAL STATUS: Force ID 150 to hold steady at ~74%
        icuBaseline = 74; 
    } else {
        // OTHERS: ICU roughly mimics General Ward strain + a little variance
        // This ensures ICU numbers dance "in tandem" with general beds but aren't robotic
        icuBaseline = (occupiedBeds / totalBeds) * 100 + (Math.random() * 10 - 5);
    }
    
    // Calculate Drift for ICU (Weaker than General Beds: 0.1 strength)
    // This creates "Correlated Chaos" - connected, but not identical
    const currentIcuOccupancy = totalICU > 0 ? (occupiedICUBeds / totalICU) * 100 : 0;
    const icuDrift = (icuBaseline - currentIcuOccupancy) * 0.1;
    occupiedICUBeds += (icuDrift / 100) * totalICU;

    // Add Standard Random Jitter
    if (Math.random() < 0.12 * (isInMciRegion ? 1.5 : 1)) occupiedICUBeds++;
    if (Math.random() < 0.12) occupiedICUBeds--;
    occupiedICUBeds = Math.max(0, Math.min(totalICU, occupiedICUBeds));

    // --- FATIGUE & SATISFACTION ---
    const occupancyStrain = (occupiedBeds / totalBeds);
    let staffFatigue_score, patientSatisfaction_pct, currentWaitTime;

    if (hospital.id === 150) {
        // Anchor Hospital logic
        const FATIGUE_TARGET = 70.0, SATISFACTION_TARGET = 68.0;
        let fatigueChange = ((occupancyStrain - 0.8) * 1.8) + ((FATIGUE_TARGET - hospital.staffFatigue_score) * 0.1) + (Math.random() - 0.5) * 1.0; 
        staffFatigue_score = hospital.staffFatigue_score + Math.max(-MAX_FATIGUE_CHANGE, Math.min(MAX_FATIGUE_CHANGE, fatigueChange));
        
        currentWaitTime = 131.0 + (Math.random() - 0.5) * 3.0;
        
        let satisfactionChange = ((SATISFACTION_TARGET - hospital.patientSatisfaction_pct) * 0.1) - ((currentWaitTime / 131.0 - 1) * 2.0) + (Math.random() - 0.5);
        patientSatisfaction_pct = hospital.patientSatisfaction_pct + Math.max(-MAX_SATISFACTION_CHANGE, Math.min(MAX_SATISFACTION_CHANGE, satisfactionChange));
    } else {
        const FATIGUE_RECOVERY_TARGET = 61;
        let fatigueChange = ((occupancyStrain - 0.78) * 6.0) + ((FATIGUE_RECOVERY_TARGET - hospital.staffFatigue_score) * 0.25) + (Math.random() - 0.5) * 2.0; 
        staffFatigue_score = hospital.staffFatigue_score + Math.max(-MAX_FATIGUE_CHANGE, Math.min(MAX_FATIGUE_CHANGE, fatigueChange));

        currentWaitTime = hospital.avgWaitTime_mins * (1 + (staffFatigue_score / 100) * 0.3) * (occupancyStrain > 0.8 ? 1 + (occupancyStrain - 0.8) * 12 : 1); 

        const SATISFACTION_RECOVERY_TARGET = 71;
        let satisfactionChange = ((SATISFACTION_RECOVERY_TARGET - hospital.patientSatisfaction_pct) * 0.15) - ((staffFatigue_score - 61) * 1.0) - ((currentWaitTime / hospital.avgWaitTime_mins - 1) * 12) + (Math.random() - 0.5) * 2.5; 
        patientSatisfaction_pct = hospital.patientSatisfaction_pct + Math.max(-MAX_SATISFACTION_CHANGE, Math.min(MAX_SATISFACTION_CHANGE, satisfactionChange));
    }

    const bedOccupancy = (occupiedBeds / totalBeds) * 100;
    const icuBedOccupancy = totalICU > 0 ? (occupiedICUBeds / totalICU) * 100 : 0;
    
    const alos_days = 5.3 + (occupancyStrain - 0.75) * 2.5 + (staffFatigue_score / 100 - 0.6) * 1.5;

    const oxygenConsumptionRate = (occupiedICUBeds / (totalICU || 1)) * 0.05 + (occupiedBeds / (totalBeds || 1)) * 0.01;
    oxygen_supply_days = Math.max(0, oxygen_supply_days - oxygenConsumptionRate);
    if (oxygen_supply_days < 10 && Math.random() < 0.15) { 
        oxygen_supply_days += Math.random() * 15 + 5;
    }

    if (Math.random() < 0.05) { 
        const currentLevelIndex = PPE_LEVELS.indexOf(ppe_stock_level);
        if (currentLevelIndex > 1 && Math.random() < 0.3) { 
            ppe_stock_level = PPE_LEVELS[currentLevelIndex - 1];
        } else if (currentLevelIndex < PPE_LEVELS.length - 1 && Math.random() < 0.1) { 
            ppe_stock_level = PPE_LEVELS[currentLevelIndex + 1];
        }
    }
    
    return {
        ...hospital, totalBeds, totalICU,
        ppe_stock_level, 
        ALOS_days: alos_days, 
        oxygen_supply_days: oxygen_supply_days, 
        occupiedBeds, occupiedICUBeds,
        availableBeds: totalBeds - occupiedBeds, availableICUBeds: totalICU - occupiedICUBeds,
        bedOccupancy,
        icuBedOccupancy: Math.min(100, icuBedOccupancy),
        currentWaitTime: Math.max(20, Math.min(300, currentWaitTime)),
        patientSatisfaction_pct: Math.max(30, Math.min(95, patientSatisfaction_pct)),
        staffFatigue_score: Math.max(10, Math.min(100, staffFatigue_score)),
        bedStatus: bedOccupancy > 95 ? 'Critical' : bedOccupancy > 80 ? 'High Occupancy' : 'Available'
    };
};

const generateInitialHistory = () => {
    return Array.from({ length: 30 }, () => ({
        date: new Date().toISOString(),
        avgOccupancy: 0, avgStaffFatigue: 0, avgSatisfaction: 0, avgWaitTime: 0,
        regionalOccupancy: {}, criticalHospitals: 0,
    }));
};

// --- ENGINE CONTROLS ---

const tick = () => {
    // --- 1. SELECTION LOGIC (15 Hospitals: 6 Public / 9 Private) ---
    const shuffledPublic = [...publicHospitalIds].sort(() => 0.5 - Math.random());
    const selectedPublic = shuffledPublic.slice(0, 6);

    const shuffledPrivate = [...privateHospitalIds].sort(() => 0.5 - Math.random());
    const selectedPrivate = shuffledPrivate.slice(0, 9);

    // Update global state
    dynamicHighStrainIds = [...selectedPublic, ...selectedPrivate];

    // --- 2. UPDATE METRICS ---
    strategicLiveData = strategicLiveData.map(h => updateLiveMetrics(h));

    // --- 3. AGGREGATE & HISTORY ---
    const totalBeds = strategicLiveData.reduce((acc, h) => acc + h.totalBeds, 0);
    const occupiedBeds = strategicLiveData.reduce((acc, h) => acc + h.occupiedBeds, 0);
    
    const regionalOccupancy: Record<string, number> = {};
    ['North', 'South', 'East', 'West', 'Central'].forEach(region => {
        const regionHospitals = strategicLiveData.filter(h => h.region === region);
        const regionTotalBeds = regionHospitals.reduce((acc, h) => acc + h.totalBeds, 0);
        const regionOccupiedBeds = regionHospitals.reduce((acc, h) => acc + h.occupiedBeds, 0);
        regionalOccupancy[region] = regionTotalBeds > 0 ? (regionOccupiedBeds / regionTotalBeds) * 100 : 0;
    });

    const newHistoryPoint: HistoricalStat = {
        date: new Date().toISOString(),
        avgOccupancy: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0,
        avgStaffFatigue: strategicLiveData.reduce((acc, h) => acc + h.staffFatigue_score, 0) / strategicLiveData.length,
        avgSatisfaction: strategicLiveData.reduce((acc, h) => acc + h.patientSatisfaction_pct, 0) / strategicLiveData.length,
        avgWaitTime: strategicLiveData.reduce((acc, h) => acc + h.currentWaitTime, 0) / strategicLiveData.length,
        regionalOccupancy,
        criticalHospitals: strategicLiveData.filter(h => h.bedOccupancy > 85).length,
    };
    
    nationalHistory = [...nationalHistory.slice(1), newHistoryPoint];
    
    subscribers.forEach(callback => callback({ liveData: strategicLiveData, history: nationalHistory }));

    // --- 4. RECURSIVE TIMER ---
    const randomDelay = Math.floor(Math.random() * 3000) + 2000; 
    setTimeout(tick, randomDelay);
};

const start = () => {
    strategicLiveData = (originalHospitalData as Hospital[]).map(initializeSimulation);
    
    setTimeout(() => {
        nationalHistory = generateInitialHistory();
        
        // Quick burn-in to stabilize history data
        for(let i = 0; i < 30; i++){
            const shuffledPublic = [...publicHospitalIds].sort(() => 0.5 - Math.random());
            const selectedPublic = shuffledPublic.slice(0, 6);
            const shuffledPrivate = [...privateHospitalIds].sort(() => 0.5 - Math.random());
            const selectedPrivate = shuffledPrivate.slice(0, 9);
            dynamicHighStrainIds = [...selectedPublic, ...selectedPrivate];

            strategicLiveData = strategicLiveData.map(h => updateLiveMetrics(h));
            
            const totalBeds = strategicLiveData.reduce((acc, h) => acc + h.totalBeds, 0);
            const occupiedBeds = strategicLiveData.reduce((acc, h) => acc + h.occupiedBeds, 0);
            const regionalOccupancy: Record<string, number> = {};
            ['North', 'South', 'East', 'West', 'Central'].forEach(region => {
                const regionHospitals = strategicLiveData.filter(h => h.region === region);
                const regionTotalBeds = regionHospitals.reduce((acc, h) => acc + h.totalBeds, 0);
                const regionOccupiedBeds = regionHospitals.reduce((acc, h) => acc + h.occupiedBeds, 0);
                regionalOccupancy[region] = regionTotalBeds > 0 ? (regionOccupiedBeds / regionTotalBeds) * 100 : 0;
            });
            const newHistoryPoint: HistoricalStat = {
                date: new Date(Date.now() - (30 - i) * 60000).toISOString(),
                avgOccupancy: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0,
                avgStaffFatigue: strategicLiveData.reduce((acc, h) => acc + h.staffFatigue_score, 0) / strategicLiveData.length,
                avgSatisfaction: strategicLiveData.reduce((acc, h) => acc + h.patientSatisfaction_pct, 0) / strategicLiveData.length,
                avgWaitTime: strategicLiveData.reduce((acc, h) => acc + h.currentWaitTime, 0) / strategicLiveData.length,
                regionalOccupancy,
                criticalHospitals: strategicLiveData.filter(h => h.bedOccupancy > 85).length,
            };
            nationalHistory = [...nationalHistory.slice(1), newHistoryPoint];
        }
        
        isInitialized = true;
        subscribers.forEach(callback => callback({ liveData: strategicLiveData, history: nationalHistory }));
        
        tick();
    }, 0);
};

export const simulationEngine = {
    subscribe: (callback: (data: { liveData: LiveHospitalData[], history: HistoricalStat[] }) => void) => {
        subscribers.push(callback);
        if (isInitialized) {
            callback({ liveData: strategicLiveData, history: nationalHistory });
        }
        return () => {
            subscribers = subscribers.filter(sub => sub !== callback);
        };
    },
    setMciState: (newState: MciState) => {
        mciState = newState;
    },
    setNodalConfig: (newConfig: NodalConfig | null) => {
        nodalConfigOverride = newConfig;
    }
};

start();