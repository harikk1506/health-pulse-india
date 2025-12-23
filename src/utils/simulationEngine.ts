// src/utils/simulationEngine.ts

import type { Hospital, LiveHospitalData, MciState, NodalConfig, HistoricalStat } from '../types';
import originalHospitalData from '../data/hospitals.json';

// --- HYPER-DYNAMIC CONFIGURATION ---
const MAX_BED_CHANGE_PER_HOUR = 3.5;
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

// --- SIMULATION LOGIC ---

const initializeSimulation = (hospital: Hospital): LiveHospitalData => {
    let baseOccupancy;
    if (hospital.id === 150) {
        baseOccupancy = 75;
    } else if (hospital.type.toLowerCase().includes('government')) {
        baseOccupancy = 68 + (Math.random() * 12);
    } else {
        baseOccupancy = 55 + (Math.random() * 10);
    }
    baseOccupancy = Math.min(baseOccupancy, 96);

    const occupiedBeds = (baseOccupancy / 100) * hospital.totalBeds;
    const bedOccupancy = (occupiedBeds / hospital.totalBeds) * 100;
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
    
    // FIX (VOLATILITY): Increased base shock from 9.0 to 10.0
    const randomShock = dynamicHighStrainIds.includes(hospital.id) ? 9.0 : 10.0; 
    let netBedChangeRaw = baseDischargeRate - baseAdmissionRate + ((Math.random() - 0.5) * randomShock);

    const isInMciRegion = mciState.isActive && mciState.region === hospital.region;
    if (isInMciRegion) netBedChangeRaw -= 3;

    let netBedChange = Math.min(Math.abs(netBedChangeRaw), MAX_BED_CHANGE_PER_HOUR) * Math.sign(netBedChangeRaw);
    let occupiedBeds = Math.max(5, Math.min(totalBeds, hospital.occupiedBeds - netBedChange));

    let baselineOccupancy = 60;
    if (hospital.id === 150) baselineOccupancy = 75;
    else if (dynamicHighStrainIds.includes(hospital.id)) baselineOccupancy = 88;
    else if (hospital.type.toLowerCase().includes('government')) baselineOccupancy = 72;
    
    const currentOccupancy = (occupiedBeds / totalBeds) * 100;
    const drift = (baselineOccupancy - currentOccupancy) * 0.4;
    occupiedBeds += (drift / 100) * totalBeds;
    occupiedBeds = Math.max(5, Math.min(totalBeds, occupiedBeds));

    let occupiedICUBeds = hospital.occupiedICUBeds;
    if (Math.random() < 0.12 * (isInMciRegion ? 1.5 : 1)) occupiedICUBeds++;
    if (Math.random() < 0.12) occupiedICUBeds--;
    occupiedICUBeds = Math.max(0, Math.min(totalICU, occupiedICUBeds));

    const occupancyStrain = (occupiedBeds / totalBeds);
    let staffFatigue_score, patientSatisfaction_pct, currentWaitTime;

    if (hospital.id === 150) {
        const FATIGUE_TARGET = 70.0, SATISFACTION_TARGET = 68.0, WAIT_TIME_TARGET = 120.0;
        let fatigueChange = ((occupancyStrain - 0.8) * 1.8) + ((FATIGUE_TARGET - hospital.staffFatigue_score) * 0.1) + (Math.random() - 0.5) * 1.0; 
        staffFatigue_score = hospital.staffFatigue_score + Math.max(-MAX_FATIGUE_CHANGE, Math.min(MAX_FATIGUE_CHANGE, fatigueChange));
        
        let baseWaitTime = hospital.avgWaitTime_mins * (1 + (staffFatigue_score / 100) * 0.15) * (occupancyStrain > 0.8 ? 1 + (occupancyStrain - 0.8) * 2 : 1);
        currentWaitTime = baseWaitTime + (WAIT_TIME_TARGET - baseWaitTime) * 0.1;
        
        let satisfactionChange = ((SATISFACTION_TARGET - hospital.patientSatisfaction_pct) * 0.1) - ((currentWaitTime / WAIT_TIME_TARGET - 1) * 4) + (Math.random() - 0.5);
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
    const eligibleHospitals = originalHospitalData.filter(h => h.type.toLowerCase().includes('government (state)'));
    const shuffled = [...eligibleHospitals].sort(() => 0.5 - Math.random());
    dynamicHighStrainIds = shuffled.slice(0, 13 + Math.floor(Math.random()*2)).map(h => h.id);

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

    // --- RECURSIVE VARIABLE TIMER START ---
    // Calculates a random delay between 2000ms and 5000ms
    // Occasional 'lag spikes' up to 6000ms will cause the UI to turn RED briefly
    const randomDelay = Math.floor(Math.random() * 3000) + 2000; 
    setTimeout(tick, randomDelay);
    // --- RECURSIVE VARIABLE TIMER END ---
};

const start = () => {
    strategicLiveData = (originalHospitalData as Hospital[]).map(initializeSimulation);
    
    setTimeout(() => {
        nationalHistory = generateInitialHistory();
        for(let i = 0; i < 30; i++){
            // We run a few ticks instantly to fill initial history
            const eligibleHospitals = originalHospitalData.filter(h => h.type.toLowerCase().includes('government (state)'));
            const shuffled = [...eligibleHospitals].sort(() => 0.5 - Math.random());
            dynamicHighStrainIds = shuffled.slice(0, 13 + Math.floor(Math.random()*2)).map(h => h.id);
            strategicLiveData = strategicLiveData.map(h => updateLiveMetrics(h));
            // (Simulating history filling without full tick overhead)
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
        
        // Start the recursive variable loop
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