// src/utils/helpers_public.ts

import { useState, useEffect, useRef } from 'react';
import type { Hospital, LiveHospitalData, HistoricalStat, MciState, NodalConfig, HistoricalDataPoint } from '../types';
import originalHospitalData from '../data/hospitals.json';

const MAX_TRANSFER_DISTANCE_KM = 85;

/* Constants for Robust Dampening (Logic Control) */
const MAX_BED_CHANGE_PER_HOUR = 2.5; // Slightly increased for more dynamism
const MAX_FATIGUE_CHANGE = 0.5;
const MAX_SATISFACTION_CHANGE = 0.75;

// Define a subset of state hospitals to be under high strain
const HIGH_STRAIN_HOSPITAL_IDS = [9, 10, 15, 17, 23, 62, 67, 70, 99, 105, 122, 135, 146];


export const getDynamicETA = (distanceKm: number, trafficMultiplier: number) => {
    const AVG_SPEED_KMPH = 45;
    const BASE_TRAFFIC_FACTOR = 1.1;
    const dynamicSwing = (trafficMultiplier - 1.0) * 0.4;
    const effectiveTrafficFactor = BASE_TRAFFIC_FACTOR + dynamicSwing;
    let totalMinutes = (distanceKm / AVG_SPEED_KMPH) * 60;
    totalMinutes *= effectiveTrafficFactor;
    return totalMinutes + 5;
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

export const calculateTheniETA = (distanceKm: number) => {
    const AVG_SPEED_KMPH = 35;
    const STATIC_TRAFFIC_FACTOR = 1.5;
    let totalMinutes = (distanceKm / AVG_SPEED_KMPH) * 60;
    totalMinutes *= STATIC_TRAFFIC_FACTOR;
    return totalMinutes + 5;
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
        let occupancy, waitTime, fatigue, icuOccupancy, satisfaction;

        if (i === 0) {
            occupancy = initialTodayState.bedOccupancy;
            icuOccupancy = initialTodayState.icuBedOccupancy;
            waitTime = initialTodayState.currentWaitTime;
            fatigue = initialTodayState.staffFatigue_score;
            satisfaction = initialTodayState.patientSatisfaction_pct;
        } else {
            const dayFactor = (30 - i) / 30;
            occupancy = initialTodayState.bedOccupancy * (0.9 + dayFactor * 0.1) + (Math.random() - 0.5) * 4;
            icuOccupancy = occupancy + 5 + (Math.random() - 0.5) * 5; // Made ICU more volatile
            waitTime = initialTodayState.avgWaitTime_mins * (0.8 + dayFactor * 0.2) + (Math.random() - 0.5) * 10;
            fatigue = initialTodayState.staffFatigue_score * (0.85 + dayFactor * 0.15) + (Math.random() - 0.5) * 5;
            const strainEffect = (1 - ((30 - i) / 30)) * 5;
            satisfaction = initialTodayState.patientSatisfaction_pct - strainEffect + (Math.random() * 2 - 1);
        }

        history.push({
            date: date.toISOString().split('T')[0],
            avgOccupancy: Math.max(50, Math.min(98, occupancy)),
            avgICUOccupancy: Math.max(40, Math.min(100, icuOccupancy)),
            avgWaitTime: Math.max(30, waitTime),
            staffFatigue: Math.max(10, Math.min(95, fatigue)),
            satisfaction: Math.max(30, Math.min(95, satisfaction))
        });
    }
    return history;
}

export const getInitialLiveHospitalData = (): LiveHospitalData[] => {
    return (originalHospitalData as Hospital[]).map(h => initializeSimulation(h));
}

export const initializeSimulation = (hospital: Hospital): LiveHospitalData => {
  let baseOccupancy;
    if (hospital.id === 150) {
        baseOccupancy = 75;
    } else if (HIGH_STRAIN_HOSPITAL_IDS.includes(hospital.id)) {
        baseOccupancy = 86 + (Math.random() * 5); // 86-91% for high strain
    } else if (hospital.type.toLowerCase().includes('government')) {
        baseOccupancy = 68 + (Math.random() * 7); // Adjusted lower to balance: 68-75%
    } else {
        baseOccupancy = 55 + (Math.random() * 10); // 55-65% for private
    }
  baseOccupancy = Math.min(baseOccupancy, 96); // Cap to allow some headroom

  const occupiedBeds = Math.floor((baseOccupancy / 100) * hospital.totalBeds);
  const bedOccupancy = (occupiedBeds / hospital.totalBeds) * 100;
  // Make ICU occupancy more volatile and distinct from general occupancy
  const icuBaseOccupancy = bedOccupancy + (Math.random() * 10 - 5);
  const occupiedICUBeds = Math.floor((icuBaseOccupancy / 100) * hospital.totalICU);
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
    icuBedOccupancy: Math.min(100, icuBedOccupancy), // Cap ICU at 100
    bedStatus: bedOccupancy > 95 ? 'Critical' : bedOccupancy > 80 ? 'High Occupancy' : 'Available',
    currentWaitTime: currentWaitTime,
    staffFatigue_score: Math.max(10, Math.min(100, staffFatigue)),
    patientSatisfaction_pct: Math.max(30, Math.min(90, patientSatisfaction_pct))
  };
};

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
  
  // Injecting more dynamism into patient flow
  const dynamicALOS = hospital.ALOS_days + (Math.random() - 0.5) * 0.2;
  const baseDischargeRate = (hospital.occupiedBeds / dynamicALOS) / 24;
  const baseAdmissionRate = (hospital.EDThroughput_perDay / 24) * 0.24;
  let netBedChangeRaw = baseDischargeRate - baseAdmissionRate + ((Math.random() - 0.5) * 4.5); // STRENGTHENED: Increased random shock

  const isInMciRegion = mciState.isActive && mciState.region === hospital.region;
  if (isInMciRegion) { netBedChangeRaw -= 3; }

  let netBedChange = Math.min(Math.abs(netBedChangeRaw), MAX_BED_CHANGE_PER_HOUR) * Math.sign(netBedChangeRaw);

  let occupiedBeds = Math.max(5, Math.min(totalBeds, hospital.occupiedBeds - netBedChange));

  let baselineOccupancy;
    if (hospital.id === 150) {
        baselineOccupancy = 75;
    } else if (HIGH_STRAIN_HOSPITAL_IDS.includes(hospital.id)) {
        baselineOccupancy = 88;
    } else if (hospital.type.toLowerCase().includes('government')) {
        baselineOccupancy = 72;
    } else {
        baselineOccupancy = 60;
    }
    const currentOccupancy = (occupiedBeds / totalBeds) * 100;
    const drift = (baselineOccupancy - currentOccupancy) * 0.25; // STRENGTHENED: Accelerated reversion to mean
    occupiedBeds += (drift / 100) * totalBeds;
    occupiedBeds = Math.max(5, Math.min(totalBeds, occupiedBeds));


  let occupiedICUBeds = hospital.occupiedICUBeds;
  const icuPressureFactor = isInMciRegion ? 1.5 : 1;
  if (Math.random() < 0.12 * icuPressureFactor) { occupiedICUBeds++; }
  if (Math.random() < 0.12) { occupiedICUBeds--; }
  occupiedICUBeds = Math.max(0, Math.min(totalICU, occupiedICUBeds));

  const occupancyStrain = (occupiedBeds / totalBeds);

  let staffFatigue_score;
  let patientSatisfaction_pct;
  let currentWaitTime;

  // UNTOUCHED: Theni's specific logic remains stable
  if (hospital.id === 150) {
    const FATIGUE_TARGET = 70.0;
    const SATISFACTION_TARGET = 68.0;
    const WAIT_TIME_TARGET = 120.0;

    const fatigueIncrease = (occupancyStrain - 0.8) * 1.5;
    const fatigueRecovery = (FATIGUE_TARGET - hospital.staffFatigue_score) * 0.1;
    let fatigueChange = fatigueIncrease + fatigueRecovery + (Math.random() - 0.5) * 0.5;
    fatigueChange = Math.max(-MAX_FATIGUE_CHANGE, Math.min(MAX_FATIGUE_CHANGE, fatigueChange));
    staffFatigue_score = hospital.staffFatigue_score + fatigueChange;

    const fatigueFactor = 1 + (staffFatigue_score / 100) * 0.15;
    const occupancyFactor = occupancyStrain > 0.8 ? 1 + (occupancyStrain - 0.8) * 2 : 1;
    let baseWaitTime = hospital.avgWaitTime_mins * occupancyFactor * fatigueFactor;
    currentWaitTime = baseWaitTime + (WAIT_TIME_TARGET - baseWaitTime) * 0.1;

    const waitTimeImpact = (currentWaitTime / WAIT_TIME_TARGET - 1) * 4;
    const satisfactionRecovery = (SATISFACTION_TARGET - hospital.patientSatisfaction_pct) * 0.1;
    let satisfactionChange = satisfactionRecovery - waitTimeImpact + (Math.random() - 0.5);
    satisfactionChange = Math.max(-MAX_SATISFACTION_CHANGE, Math.min(MAX_SATISFACTION_CHANGE, satisfactionChange));
    patientSatisfaction_pct = hospital.patientSatisfaction_pct + satisfactionChange;

  } else {
    // STRENGTHENED: KPI dynamics for all other hospitals
    const FATIGUE_RECOVERY_TARGET = 61;
    const fatigueIncrease = (occupancyStrain - 0.78) * 0.9; // STRENGTHENED
    const naturalRecovery = (FATIGUE_RECOVERY_TARGET - hospital.staffFatigue_score) * 0.1;
    let fatigueChange = fatigueIncrease + naturalRecovery + (Math.random() - 0.5) * 0.4;
    fatigueChange = Math.max(-MAX_FATIGUE_CHANGE, Math.min(MAX_FATIGUE_CHANGE, fatigueChange));
    staffFatigue_score = hospital.staffFatigue_score + fatigueChange;

    const fatigueFactor = 1 + (staffFatigue_score / 100) * 0.2;
    const occupancyFactor = occupancyStrain > 0.8 ? 1 + (occupancyStrain - 0.8) * 5 : 1; // STRENGTHENED
    currentWaitTime = hospital.avgWaitTime_mins * occupancyFactor * fatigueFactor;

    const SATISFACTION_RECOVERY_TARGET = 71;
    const fatigueImpact = (staffFatigue_score - 61) * 0.22; // STRENGTHENED
    const waitTimeImpact = (currentWaitTime / hospital.avgWaitTime_mins - 1) * 4.5; // STRENGTHENED
    const naturalSatisfactionRecovery = (SATISFACTION_RECOVERY_TARGET - hospital.patientSatisfaction_pct) * 0.08;
    let satisfactionChange = naturalSatisfactionRecovery - fatigueImpact - waitTimeImpact + (Math.random() - 0.5);
    satisfactionChange = Math.max(-MAX_SATISFACTION_CHANGE, Math.min(MAX_SATISFACTION_CHANGE, satisfactionChange));
    patientSatisfaction_pct = hospital.patientSatisfaction_pct + satisfactionChange;
  }

  const bedOccupancy = (occupiedBeds / totalBeds) * 100;
  const icuBedOccupancy = totalICU > 0 ? (occupiedICUBeds / totalICU) * 100 : 0;

  const alos_days = 5.3 + (occupancyStrain - 0.78) * 0.15 + (staffFatigue_score / 100 - 0.6) * 0.15;
  const oxygenConsumptionRate = (occupiedICUBeds / totalICU) * 0.015 + (occupiedBeds / totalBeds) * 0.004;
  oxygen_supply_days = Math.max(0, oxygen_supply_days - oxygenConsumptionRate);

  return {
    ...hospital, totalBeds, totalICU,
    ALOS_days: alos_days,
    oxygen_supply_days: oxygen_supply_days,
    occupiedBeds: Math.floor(occupiedBeds), occupiedICUBeds: Math.floor(occupiedICUBeds),
    availableBeds: Math.floor(totalBeds - occupiedBeds), availableICUBeds: Math.floor(totalICU - occupiedICUBeds),
    bedOccupancy,
    icuBedOccupancy: Math.min(100, icuBedOccupancy),
    currentWaitTime: Math.max(20, Math.min(300, currentWaitTime)),
    patientSatisfaction_pct: Math.max(30, Math.min(95, patientSatisfaction_pct)),
    staffFatigue_score: Math.max(10, Math.min(100, staffFatigue_score)),
    bedStatus: bedOccupancy > 95 ? 'Critical' : bedOccupancy > 80 ? 'High Occupancy' : 'Available'
  };
};