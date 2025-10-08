// src/IntroPage.tsx

import { useState, useEffect } from 'react';
import { FaUsers, FaAmbulance, FaHospitalUser, FaUniversity, FaArrowRight, FaBullseye, FaBookOpen } from 'react-icons/fa';
import { IconType } from 'react-icons'; // Corrected Import
import IndianLogo from './assets/logo.svg';
import type { Portal } from './types';

const PortalLink = ({ title, description, icon: Icon, onEnter, portal, colorClass }: {title: string, description: string, icon: IconType, onEnter: (portal: Portal) => void, portal: Portal, colorClass: string}) => (
    <div
        onClick={() => onEnter(portal)}
        className={`group relative flex flex-col items-center justify-center p-5 rounded-lg cursor-pointer transition-all duration-300 bg-white/70 hover:bg-white/90 border-2 border-transparent hover:border-${colorClass}-500/50 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1`}
    >
        <Icon size={26} className={`text-${colorClass}-500 mb-2 transition-transform duration-300 group-hover:scale-110`} />
        <h3 className="text-md font-semibold tracking-wide text-gray-900 font-sans">{title}</h3>
        <p className="text-xs text-gray-700 mt-1 text-center font-sans font-medium whitespace-nowrap">{description}</p>
        <FaArrowRight className="absolute bottom-2 right-2 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 transition-all duration-300" />
    </div>
);


const IntroPage = ({ onEnter }: { onEnter: (portal: Portal) => void }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col h-screen w-screen font-sans flag-background overflow-hidden">
            <main className="flex-grow flex items-center justify-center p-4 relative">
                <div className="w-full max-w-4xl bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center space-x-4 mb-4">
                            <img src={IndianLogo} alt="Logo" className="h-12 w-12"/>
                            <h1 className="text-2xl font-bold tracking-tight text-black font-display">India's Health Pulse</h1>
                        </div>
                        <div className='p-3 bg-blue-50/70 border-l-4 border-blue-500 rounded-r-lg mb-4'>
                            <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2 text-md tracking-wide font-display"><FaBullseye /> Core Vision</h4>
                            <blockquote className="text-sm text-blue-900/90 font-medium">
                               To create a faithful, data grounded digital twin of India’s hospital infrastructure to support data informed decision making.
                            </blockquote>
                        </div>
                        <div className="text-black/80 text-xs space-y-2 leading-relaxed font-normal">
                            <p>
                                Born from a vision to model India’s complex health infrastructure, this project is a dynamic, data-driven simulation built to reflect how hospitals function, respond, and adapt under varying pressures.
                            </p>
                            <p>
                                It represents weeks of focused solo development, powered by a dataset of manually verified hospitals across five zones of India — refined over hours of validation to ensure reliability and precision.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col h-full justify-between">
                        <div className="grid grid-cols-2 gap-4 flex-grow">
                            <PortalLink title="Public" description="View live hospital data" icon={FaUsers} onEnter={onEnter} portal="PUBLIC" colorClass="blue" />
                            <PortalLink title="Emergency" description="Ambulance dispatch" icon={FaAmbulance} onEnter={onEnter} portal="EMERGENCY" colorClass="red" />
                            <PortalLink title="Hospital" description="Manage a single facility" icon={FaHospitalUser} onEnter={onEnter} portal="HOSPITAL" colorClass="green" />
                            <PortalLink title="Strategic" description="National command" icon={FaUniversity} onEnter={onEnter} portal="STRATEGIC" colorClass="purple" />
                        </div>
                         <div className='text-sm mt-4 pt-3 pb-2 px-4 bg-amber-50/70 border-t-4 border-amber-400 rounded-b-lg'>
                           <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2 text-md tracking-wide font-display"><FaBookOpen /> Instructions</h4>
                           <ul className="list-disc list-inside space-y-1 pl-1 font-medium text-amber-900/90 text-xs">
                               <li>Click any portal to access its interactive dashboard.</li>
                               <li>Some portals require clicking the authentication button.</li>
                               <li>Switch portals anytime using the header menu.</li>
                           </ul>
                        </div>
                    </div>
                </div>
            </main>
             <footer className="w-full py-1 bg-white/60 backdrop-blur-md border-t border-gray-200 flex-shrink-0 flex justify-between items-center px-4">
                <p className="text-gray-500 text-[10px] font-semibold">Powered by Dual-Simulation Engine | React + Vite</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-semibold">
                    <span>Session IP: 103.48.198.141</span>
                    <span>{currentTime.toLocaleTimeString()}</span>
                </div>
            </footer>
        </div>
    );
};

export default IntroPage;