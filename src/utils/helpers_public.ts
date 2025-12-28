// src/utils/helpers_public.ts
import { useState, useEffect, useRef } from 'react';
import type { Hospital, LiveHospitalData, HistoricalStat, MciState, NodalConfig, HistoricalDataPoint } from '../types';
import originalHospitalData from '../data/hospitals.json';

const MAX_TRANSFER_DISTANCE_KM = 85;

/* --- MISSING CONSTANTS ADDED HERE (FIXES CRASH) --- */
const MAX_BED_CHANGE_PER_HOUR = 2.5; 
const MAX_FATIGUE_CHANGE = 0.5;
const MAX_SATISFACTION_CHANGE = 0.75;

// --- UPDATED HIGH STRAIN LIST (AUDITED FROM YOUR CSV) ---
// Removed Low Strain (9, 70, 99) | Added Critical (100, 114, 112, 87, 133)
const HIGH_STRAIN_HOSPITAL_IDS = [
    8, 10, 18, 21, 27, 34, 50, 54, 57, 59, 62, 80, 87, 
    100, 105, 109, 112, 114, 122, 133, 135, 143
];

// --- ETA LOGIC (45km/h * 1.2 Traffic) ---
export const getDynamicETA = (distanceKm: number, trafficMultiplier: number) => {
    const AVG_SPEED_KMPH = 45; 
    const BASE_TRAFFIC_FACTOR = 1.2; 
    const dynamicSwing = (trafficMultiplier - 1.0) * 0.4;
    const effectiveTrafficFactor = BASE_TRAFFIC_FACTOR + dynamicSwing;
    
    let totalMinutes = (distanceKm / AVG_SPEED_KMPH) * 60;
    totalMinutes *= effectiveTrafficFactor;
    return Math.round(totalMinutes + 5); 
};

export const calculateTheniETA = (distanceKm: number) => {
    return getDynamicETA(distanceKm, 1.2); 
};

export const useGeolocation = (
    portalType: 'public' | 'emergency',
    _missionPhase?: string,
    destinationCoords?: [number, number] | null,
    isMissionActive?: boolean,
    simulationDuration?: number
) => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;
  const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (portalType === 'public') {
      // Default center point for Public view
      setLocation([10.015, 77.48]);
    } else {
      const startingPoints = [ [10.015, 77.48], [9.925, 78.119], [10.36, 77.98] ];
      const randomStart = startingPoints[Math.floor(Math.random() * startingPoints.length)];
      const timer = setTimeout(() => setLocation(randomStart as [number, number]), 1500);
      return () => clearTimeout(timer);
    }
  }, [portalType]);

  useEffect(() => {
    if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
        movementIntervalRef.current = null;
    }
    if ( portalType === 'emergency' && isMissionActive && destinationCoords && locationRef.current && simulationDuration ) {
        const startLat = locationRef.current[0]; const startLon = locationRef.current[1];
        const endLat = destinationCoords[0]; const endLon = destinationCoords[1];
        const totalDurationMs = simulationDuration * 1000;
        const updateInterval = 2000;
        const totalSteps = totalDurationMs / updateInterval;
        let currentStep = 0;
        movementIntervalRef.current = setInterval(() => {
            currentStep++;
            if (currentStep >= totalSteps) {
                setLocation([endLat, endLon]);
                if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
                return;
            }
            const fraction = currentStep / totalSteps;
            const newLat = startLat + (endLat - startLat) * fraction;
            const newLon = startLon + (endLon - startLon) * fraction;
            setLocation([newLat, newLon]);
        }, updateInterval);
    }
    return () => { if (movementIntervalRef.current) clearInterval(movementIntervalRef.current); };
  }, [portalType, isMissionActive, destinationCoords, simulationDuration]);

  return { location };
};

export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
};

export const useDebounce = <T>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => { const handler = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(handler); }, [value, delay]);
    return debouncedValue;
};

export const getMaxTransferDistance = () => MAX_TRANSFER_DISTANCE_KM;

export const generateMockHistory = (): HistoricalStat[] => {
    const today = new Date();
    const history: HistoricalStat[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        history.push({
            date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            avgOccupancy: 78.5 + Math.random() * 4 - 2,
            criticalHospitals: 7 + Math.floor(Math.random() * 5) - 2,
            avgStaffFatigue: 61,
            avgSatisfaction: 71,
            avgWaitTime: 90,
            regionalOccupancy: {}
        });
    }
    return history;
}

export const generateHospitalHistory = (hospital: Hospital): HistoricalDataPoint[] => {
    const history: HistoricalDataPoint[] = [];
    const today = new Date();
    const initialTodayState = initializeSimulation(hospital);
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        history.push({
            date: date.toISOString().split('T')[0],
            avgOccupancy: Math.max(50, Math.min(98, initialTodayState.bedOccupancy + (Math.random() - 0.5) * 10)),
            avgICUOccupancy: Math.max(40, Math.min(100, initialTodayState.icuBedOccupancy + (Math.random() - 0.5) * 10)),
            avgWaitTime: Math.max(30, initialTodayState.currentWaitTime + (Math.random() - 0.5) * 20),
            staffFatigue: Math.max(10, Math.min(95, initialTodayState.staffFatigue_score)),
            satisfaction: Math.max(30, Math.min(95, initialTodayState.patientSatisfaction_pct))
        });
    }
    return history;
}

export const getInitialLiveHospitalData = (): LiveHospitalData[] => {
    return (originalHospitalData as Hospital[]).map(h => initializeSimulation(h));
}

// --- INITIALIZE SIMULATION (Uses New High Strain List) ---
export const initializeSimulation = (hospital: Hospital): LiveHospitalData => {
  let baseOccupancy;

  // Hybrid Logic: Custom Outliers vs Simulation
  if (
      hospital.occupancyRate_pct && 
      hospital.occupancyRate_pct !== 70 && 
      hospital.occupancyRate_pct !== 75 && 
      hospital.occupancyRate_pct !== 85
  ) {
      baseOccupancy = hospital.occupancyRate_pct + (Math.random() * 4 - 2);
  } 
  else if (hospital.id === 150) { baseOccupancy = 75; } 
  else if (HIGH_STRAIN_HOSPITAL_IDS.includes(hospital.id)) { baseOccupancy = 86 + (Math.random() * 5); } 
  else if (hospital.type.toLowerCase().includes('government')) { baseOccupancy = 68 + (Math.random() * 7); } 
  else { baseOccupancy = 55 + (Math.random() * 10); }
  
  baseOccupancy = Math.min(baseOccupancy, 102); 

  const occupiedBeds = Math.floor((baseOccupancy / 100) * hospital.totalBeds);
  const bedOccupancyRaw = (occupiedBeds / hospital.totalBeds) * 100;
  
  const icuBaseOccupancy = bedOccupancyRaw + (Math.random() * 10 - 5);
  const occupiedICUBeds = Math.floor((icuBaseOccupancy / 100) * hospital.totalICU);
  const icuBedOccupancy = hospital.totalICU > 0 ? (occupiedICUBeds / hospital.totalICU) * 100 : 0;

  let staffFatigue = 61 + (Math.random() - 0.5) * 5;
  let patientSatisfaction_pct = 71 + (Math.random() - 0.5) * 5;
  let currentWaitTime = hospital.avgWaitTime_mins * (1 + (bedOccupancyRaw - 75) / 100);

  if (hospital.id === 150) {
    staffFatigue = 70.0;
    patientSatisfaction_pct = 68.0;
    currentWaitTime = 120.0;
  }

  const bedOccupancy = Math.min(100, bedOccupancyRaw);
  
  let bedStatus = 'Available';
  if (bedOccupancy >= 98) { bedStatus = 'AT CAPACITY'; } 
  else if (bedOccupancy > 95) { bedStatus = 'Critical'; } 
  else if (bedOccupancy > 80) { bedStatus = 'High Occupancy'; }

  // Strict 0 override
  let displayAvailableBeds = Math.max(0, hospital.totalBeds - occupiedBeds);
  if (bedStatus === 'AT CAPACITY') { displayAvailableBeds = 0; }

  return {
    ...hospital,
    occupiedBeds,
    occupiedICUBeds,
    availableBeds: displayAvailableBeds,
    availableICUBeds: Math.max(0, hospital.totalICU - occupiedICUBeds),
    bedOccupancy,
    icuBedOccupancy: Math.min(100, icuBedOccupancy), 
    bedStatus,
    currentWaitTime: currentWaitTime,
    staffFatigue_score: Math.max(10, Math.min(100, staffFatigue)),
    patientSatisfaction_pct: Math.max(30, Math.min(90, patientSatisfaction_pct))
  };
};

// --- UPDATE LIVE METRICS (Uses New High Strain List & Constants) ---
export const updateLiveMetrics = (
    hospital: LiveHospitalData,
    mciState: MciState,
    nodalConfigOverride: NodalConfig | null
): LiveHospitalData => {

  let { totalBeds, totalICU, oxygen_supply_days } = hospital;
  if (nodalConfigOverride && hospital.id === nodalConfigOverride.hospitalId && Date.now() < nodalConfigOverride.activeUntil) {
      totalBeds = nodalConfigOverride.totalBeds;
      totalICU = nodalConfigOverride.totalICU;
      oxygen_supply_days = nodalConfigOverride.oxygen_supply_days;
  }
  
  const dynamicALOS = hospital.ALOS_days + (Math.random() - 0.5) * 0.2;
  const baseDischargeRate = (hospital.occupiedBeds / dynamicALOS) / 24;
  const baseAdmissionRate = (hospital.EDThroughput_perDay / 24) * 0.24;
  let netBedChangeRaw = baseDischargeRate - baseAdmissionRate + ((Math.random() - 0.5) * 4.5); 

  const isInMciRegion = mciState.isActive && mciState.region === hospital.region;
if (isInMciRegion) {
    // 3% Shock: 100 beds -> 3 beds | 2000 beds -> 60 beds
    const mciImpact = Math.max(3, Math.floor(totalBeds * 0.03));
    netBedChangeRaw -= mciImpact; 
}

  // === [FIX START] DYNAMIC THRESHOLDS (The Goldilocks Logic) ===
  // Floor: 2 beds (Ensures small clinics don't freeze)
  // Rate: 0.5% (Ensures standard hospitals feel alive)
  // Ceiling: 12 beds (Ensures Giants like SMS Jaipur don't explode)
  
  const dynamicMaxChange = Math.max(2, Math.min(12, Math.floor(totalBeds * 0.005)));

  let netBedChange = Math.min(Math.abs(netBedChangeRaw), dynamicMaxChange) * Math.sign(netBedChangeRaw);
  
  // === [FIX END] ===

  let occupiedBeds = Math.max(5, Math.min(totalBeds, hospital.occupiedBeds - netBedChange));

  let baselineOccupancy;
    if (
        hospital.occupancyRate_pct && 
        hospital.occupancyRate_pct !== 70 && 
        hospital.occupancyRate_pct !== 75 && 
        hospital.occupancyRate_pct !== 85
    ) {
        baselineOccupancy = hospital.occupancyRate_pct;
    } else if (hospital.id === 150) { baselineOccupancy = 75; } 
    else if (HIGH_STRAIN_HOSPITAL_IDS.includes(hospital.id)) { baselineOccupancy = 88; } 
    else if (hospital.type.toLowerCase().includes('government')) { baselineOccupancy = 72; } 
    else { baselineOccupancy = 60; }

    const currentOccupancyRaw = (occupiedBeds / totalBeds) * 100;
    const drift = (baselineOccupancy - currentOccupancyRaw) * 0.25; 
    occupiedBeds += (drift / 100) * totalBeds;
    occupiedBeds = Math.max(5, Math.min(totalBeds, occupiedBeds));

  let occupiedICUBeds = hospital.occupiedICUBeds;
  
  // 1. Define Target (Baseline)
  // We use the 'baselineOccupancy' we just calculated for General Beds.
  // This couples the ICU to the General Ward status.
  // We add +2% bias because ICUs often run slightly tighter than wards.
  const icuBaseline = baselineOccupancy + 2; 

  // 2. Calculate Current Status
  const currentIcuOccupancy = totalICU > 0 ? (occupiedICUBeds / totalICU) * 100 : 0;

  // 3. Apply "Rubber Band" Drift
  // If we are far from the target, pull towards it.
  const icuDrift = (icuBaseline - currentIcuOccupancy) * 0.20; 
  occupiedICUBeds += (icuDrift / 100) * totalICU;

  // 4. Add Noise & Pressure
  const icuPressureFactor = isInMciRegion ? 1.5 : 1;
  // Slightly higher chance to add patient than remove, to fight empty-drift
  if (Math.random() < 0.14 * icuPressureFactor) { occupiedICUBeds++; }
  if (Math.random() < 0.12) { occupiedICUBeds--; }

  // 5. Safety Clamp
  occupiedICUBeds = Math.max(0, Math.min(totalICU, occupiedICUBeds));

  const occupancyStrain = (occupiedBeds / totalBeds);
  let staffFatigue_score;
  let patientSatisfaction_pct;
  let currentWaitTime;

  const FATIGUE_RECOVERY_TARGET = hospital.id === 150 ? 70 : 61;
  const SATISFACTION_RECOVERY_TARGET = hospital.id === 150 ? 68 : 71;
  
  const naturalRecovery = (FATIGUE_RECOVERY_TARGET - hospital.staffFatigue_score) * 0.1;
  const fatigueIncrease = (occupancyStrain - 0.78) * 0.9;
  let fatigueChange = fatigueIncrease + naturalRecovery + (Math.random() - 0.5) * 0.4;
  fatigueChange = Math.max(-MAX_FATIGUE_CHANGE, Math.min(MAX_FATIGUE_CHANGE, fatigueChange));
  staffFatigue_score = hospital.staffFatigue_score + fatigueChange;

  const fatigueFactor = 1 + (staffFatigue_score / 100) * 0.2;
  const occupancyFactor = occupancyStrain > 0.8 ? 1 + (occupancyStrain - 0.8) * 5 : 1; 
  currentWaitTime = hospital.avgWaitTime_mins * occupancyFactor * fatigueFactor;
  currentWaitTime = Math.max(20, Math.min(300, currentWaitTime));

  const waitTimeImpact = (currentWaitTime / hospital.avgWaitTime_mins - 1) * 4.5;
  const naturalSatisfactionRecovery = (SATISFACTION_RECOVERY_TARGET - hospital.patientSatisfaction_pct) * 0.08;
  let satisfactionChange = naturalSatisfactionRecovery - waitTimeImpact + (Math.random() - 0.5);
  satisfactionChange = Math.max(-MAX_SATISFACTION_CHANGE, Math.min(MAX_SATISFACTION_CHANGE, satisfactionChange));
  patientSatisfaction_pct = hospital.patientSatisfaction_pct + satisfactionChange;

  const bedOccupancyRaw = (occupiedBeds / totalBeds) * 100;
  const bedOccupancy = Math.min(100, bedOccupancyRaw);

  const icuBedOccupancy = totalICU > 0 ? (occupiedICUBeds / totalICU) * 100 : 0;
  const alos_days = 5.3 + (occupancyStrain - 0.78) * 0.15 + (staffFatigue_score / 100 - 0.6) * 0.15;
  const oxygenConsumptionRate = (occupiedICUBeds / totalICU) * 0.015 + (occupiedBeds / totalBeds) * 0.004;
  oxygen_supply_days = Math.max(0, oxygen_supply_days - oxygenConsumptionRate);

  let bedStatus = 'Available';
  if (bedOccupancy >= 98) { bedStatus = 'AT CAPACITY'; } 
  else if (bedOccupancy > 95) { bedStatus = 'Critical'; } 
  else if (bedOccupancy > 80) { bedStatus = 'High Occupancy'; }

  let displayAvailableBeds = Math.max(0, Math.floor(totalBeds - occupiedBeds));
  if (bedStatus === 'AT CAPACITY') { displayAvailableBeds = 0; }

  return {
    ...hospital, totalBeds, totalICU,
    ALOS_days: alos_days,
    oxygen_supply_days: oxygen_supply_days,
    occupiedBeds: Math.floor(occupiedBeds), 
    occupiedICUBeds: Math.floor(occupiedICUBeds),
    availableBeds: displayAvailableBeds, 
    availableICUBeds: Math.floor(totalICU - occupiedICUBeds),
    bedOccupancy,
    icuBedOccupancy: Math.min(100, icuBedOccupancy),
    currentWaitTime,
    patientSatisfaction_pct: Math.max(30, Math.min(95, patientSatisfaction_pct)),
    staffFatigue_score: Math.max(10, Math.min(100, staffFatigue_score)),
    bedStatus
  };
};