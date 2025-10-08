// src/types/index.ts

export interface Hospital {
  id: number;
  name: string;
  state: string;
  type: string;
  address: string;
  coords: [number, number];
  googleRating: number;
  totalBeds: number;
  totalICU: number;
  helpline: string;
  minConsultCharge: number;
  opdOpen: string;
  opdClose: string;
  availableHours: string;
  avgWaitTime_mins: number;
  ALOS_days: number;
  EDThroughput_perDay: number;
  patientSatisfaction_pct: number;
  staffCount_est: number;
  staffPatientRatio: number;
  hoursCarePerPatientDay: number;
  occupancyRate_pct: number;
  avgDailyInpatientFlow: number;
  region: 'North' | 'South' | 'East' | 'West' | 'Central';
  isTeachingHospital: boolean;
  oxygen_supply_days: number;
  ppe_stock_level: 'Good' | 'Low' | 'Critical' | 'Stockout';
}

export type BedStatus = 'Available' | 'High Occupancy' | 'Critical' | 'Accepting Transfers';

export interface LiveHospitalData extends Hospital {
  occupiedBeds: number;
  occupiedICUBeds: number;
  bedOccupancy: number;
  icuBedOccupancy: number;
  currentWaitTime: number;
  bedStatus: BedStatus;
  availableBeds: number;
  availableICUBeds: number;
  distance?: number;
  staffFatigue_score: number;
  patientSatisfaction_pct: number;
}

export type SortKey = 'distance' | 'googleRating' | 'currentWaitTime' | 'minConsultCharge' | 'availableBeds' | 'availableICUBeds';

export type Metric = 'occupancy' | 'waitTime' | 'fatigue' | 'satisfaction';

export type HistoricalPeriod = '30d' | '7d' | '24h';

export interface Filters {
  searchTerm: string;
  types: string[];
  hasICU: boolean;
  isOpen247: boolean;
  goodPPE: boolean;
}

export interface HistoricalStat {
    date: string;
    avgOccupancy: number;
    avgStaffFatigue: number;
    avgSatisfaction: number;
    avgWaitTime: number;
    regionalOccupancy: Record<string, number>;
    criticalHospitals: number;
}

// UPDATED: Type for hospital-specific historical data points
export interface HistoricalDataPoint {
    date: string;
    avgOccupancy: number;
    avgICUOccupancy: number; // ADDED for dual occupancy line
    avgWaitTime: number;
    staffFatigue: number;
    satisfaction: number;
}

// NEW: Type for Audit Log entries
export interface AuditLogEntry {
    timestamp: string;
    officer: string;
    action: string;
    oldValue?: string | number;
    newValue: string | number;
}


export type Language = 'en' | 'hi';

// NEW: Define the tiered dropdown options
export type OwnershipType = 'Government (Central)' | 'Government (State)' | 'Government (UT)' | 'Private (Trust)' | 'Private (Large)' | 'Private (Mid-size)' | 'Private (Speciality)'; 

export interface MciState {
  isActive: boolean;
  region: Hospital['region'] | null;
}

export interface NodalConfig {
  hospitalId: number;
  totalBeds: number;
  totalICU: number;
  activeUntil: number;
  oxygen_supply_days: number;
  ppe_stock_level: Hospital['ppe_stock_level'];
}

export interface Shipment {
  id: string;
  hospitalId: number;
  name: string;
  eta: number;
  needs: string;
  dispatchTime: number;
  status: 'IN TRANSIT' | 'ARRIVED';
  triggeredByNodal?: boolean;
}

export interface AmbulanceAlert {
  eta: number;
  isCritical: boolean;
  hospitalName: string;
  timestamp: number;
}

// EXPANDED Global Context for cross-portal data
export interface GlobalContextType {
    liveData: LiveHospitalData[];
    mciState: MciState;
    setMciState: React.Dispatch<React.SetStateAction<MciState>>;
    isHospitalBlocked: boolean;
    setIsHospitalBlocked: React.Dispatch<React.SetStateAction<boolean>>;
    trafficMultiplier: number;
    addGroundFeedback: (feedback: string) => void;
    groundFeedback: string[];
    setGroundFeedback: React.Dispatch<React.SetStateAction<string[]>>;
    // Props for Hospital/Logistics Portals
    setNodalConfigOverride: (config: NodalConfig | null) => void;
    nodalConfigOverride: NodalConfig | null;
    activeShipments: Shipment[];
    setActiveShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
    // New prop for inter-portal communication
    ambulanceAlert: AmbulanceAlert | null;
    setAmbulanceAlert: React.Dispatch<React.SetStateAction<AmbulanceAlert | null>>;
    nationalHistory: HistoricalStat[];
}