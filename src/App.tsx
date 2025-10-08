// src/App.tsx

import React, { useState, useEffect, useMemo, createContext, useCallback } from 'react';
import PublicPortal from './portals/public/PublicPortal';
import EmergencyPortal from './portals/emergency/EmergencyPortal.tsx';
import HospitalPortal from './portals/hospital/HospitalPortal.tsx';
import StrategicPortal from './portals/strategic/StrategicPortal.tsx';
import IntroPage from './IntroPage';
import { getInitialLiveHospitalData as getInitialPublicData, updateLiveMetrics as updatePublicMetrics } from './utils/helpers_public';
import { simulationEngine } from './utils/simulationEngine'; // <-- IMPORT THE NEW ENGINE
import type { GlobalContextType, LiveHospitalData, Language, MciState, NodalConfig, Shipment, AmbulanceAlert, HistoricalStat, Portal } from './types';

export const LanguageContext = createContext({
    language: 'en',
    setLanguage: (_lang: Language) => {},
});

const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguage] = useState<Language>('en');
    const value = useMemo(() => ({ language, setLanguage }), [language]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

const defaultGlobalContext: GlobalContextType = {
    liveData: [],
    mciState: { isActive: false, region: null },
    setMciState: () => {},
    isHospitalBlocked: false,
    setIsHospitalBlocked: () => {},
    trafficMultiplier: 1.0,
    addGroundFeedback: () => {},
    groundFeedback: [],
    setGroundFeedback: () => {},
    setNodalConfigOverride: () => {},
    nodalConfigOverride: null,
    activeShipments: [],
    setActiveShipments: () => {},
    ambulanceAlert: null,
    setAmbulanceAlert: () => {},
    nationalHistory: [],
};

export const GlobalContext = createContext<GlobalContextType>(defaultGlobalContext);
export const StrategicContext = createContext<GlobalContextType>(defaultGlobalContext);

const DataProvider = ({ children }: { children: React.ReactNode }) => {
    // State for Public/Emergency Portals (calm simulation)
    const [publicLiveData, setPublicLiveData] = useState<LiveHospitalData[]>(getInitialPublicData());

    // State for Hospital/Strategic Portals (fed by the new engine)
    const [strategicLiveData, setStrategicLiveData] = useState<LiveHospitalData[]>([]);
    const [nationalHistory, setNationalHistory] = useState<HistoricalStat[]>([]);


    // Shared State
    const [mciState, setMciState] = useState<MciState>({ isActive: false, region: null });
    const [isHospitalBlocked, setIsHospitalBlocked] = useState(false);
    const [trafficMultiplier, setTrafficMultiplier] = useState(1.0);
    const [groundFeedback, setGroundFeedback] = useState<string[]>([]);
    const [nodalConfigOverride, setNodalConfigOverride] = useState<NodalConfig | null>(null);
    const [activeShipments, setActiveShipments] = useState<Shipment[]>([]);
    const [ambulanceAlert, setAmbulanceAlert] = useState<AmbulanceAlert | null>(null);

    const addGroundFeedback = useCallback((feedback: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setGroundFeedback(prev => [`[${timestamp}] ${feedback}`, ...prev].slice(0, 10));
    }, []);

    // Update loop for Public/Emergency data (calm simulation)
    useEffect(() => {
        const interval = setInterval(() => {
            setPublicLiveData(currentData =>
                currentData.map(h => updatePublicMetrics(h, mciState, nodalConfigOverride))
            );
            setTrafficMultiplier(1.0 + Math.random() * 1.5);
        }, 3000);
        return () => clearInterval(interval);
    }, [mciState, nodalConfigOverride]);

    // **FIX:** This useEffect now runs only ONCE to subscribe to the engine.
    useEffect(() => {
        const unsubscribe = simulationEngine.subscribe(({ liveData, history }) => {
            setStrategicLiveData(liveData);
            setNationalHistory(history);
        });

        return () => unsubscribe(); // Clean up subscription on component unmount
    }, []); // <-- Empty dependency array ensures this runs only once.

    // **FIX:** This separate useEffect is responsible for pushing state changes INTO the engine.
    useEffect(() => {
        simulationEngine.setMciState(mciState);
        simulationEngine.setNodalConfig(nodalConfigOverride);
    }, [mciState, nodalConfigOverride]);


    const publicContextValue = useMemo(() => ({
        liveData: publicLiveData,
        mciState, setMciState, isHospitalBlocked, setIsHospitalBlocked, trafficMultiplier,
        addGroundFeedback, groundFeedback, setGroundFeedback, setNodalConfigOverride, nodalConfigOverride,
        activeShipments, setActiveShipments, ambulanceAlert, setAmbulanceAlert, nationalHistory,
    }), [publicLiveData, mciState, isHospitalBlocked, trafficMultiplier, groundFeedback, addGroundFeedback, nodalConfigOverride, activeShipments, ambulanceAlert, nationalHistory]);

    const strategicContextValue = useMemo(() => ({
        liveData: strategicLiveData,
         mciState, setMciState, isHospitalBlocked, setIsHospitalBlocked, trafficMultiplier,
        addGroundFeedback, groundFeedback, setGroundFeedback, setNodalConfigOverride, nodalConfigOverride,
        activeShipments, setActiveShipments, ambulanceAlert, setAmbulanceAlert, nationalHistory
    }), [strategicLiveData, mciState, isHospitalBlocked, trafficMultiplier, groundFeedback, addGroundFeedback, nodalConfigOverride, activeShipments, ambulanceAlert, nationalHistory]);

    return (
        <GlobalContext.Provider value={publicContextValue}>
            <StrategicContext.Provider value={strategicContextValue}>
                {children}
            </StrategicContext.Provider>
        </GlobalContext.Provider>
    );
};

const App = () => {
  const [activePortal, setActivePortal] = useState<Portal>('PUBLIC');
  const [hasEntered, setHasEntered] = useState(false);

  const handleGoToIntro = () => {
      setHasEntered(false);
  };

  // UPDATED: handleEnter now accepts a portal and sets it as active
  const handleEnter = (portal: Portal) => {
      setActivePortal(portal);
      setHasEntered(true);
  };

  const renderPortal = () => {
    const portalProps = { activePortal, setActivePortal, onGoToIntro: handleGoToIntro };
    switch (activePortal) {
      case 'PUBLIC': return <PublicPortal {...portalProps} />;
      case 'EMERGENCY': return <EmergencyPortal {...portalProps} />;
      case 'HOSPITAL': return <HospitalPortal {...portalProps} />;
      case 'STRATEGIC': return <StrategicPortal {...portalProps} />;
      default: return <PublicPortal {...portalProps} />;
    }
  };

  if (!hasEntered) {
      // UPDATED: Pass the new handleEnter function to IntroPage
      return <IntroPage onEnter={handleEnter} />;
  }

  return (
    <LanguageProvider>
        <DataProvider>
            {renderPortal()}
        </DataProvider>
    </LanguageProvider>
  );
};

export default App;