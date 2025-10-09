// src/portals/public/components/HospitalDetailView.tsx
import { useContext, useEffect, useState } from 'react';
import { FaDirections, FaExclamationTriangle, FaPhone, FaSpinner, FaStethoscope } from 'react-icons/fa';
import { GlobalContext } from '../../../App';
import { useTranslations } from '../../../hooks/useTranslations';
import type { LiveHospitalData } from '../../../types';
import { calculateTheniETA, getMaxTransferDistance } from '../../../utils/helpers_public';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const HospitalDetailView = ({ hospital, onBack }: { hospital: LiveHospitalData; onBack: () => void; }) => {
    const t = useTranslations();
    const { isHospitalBlocked } = useContext(GlobalContext);
    const isThisHospitalBlocked = hospital.id === 1 && isHospitalBlocked;

    const [lat, lng] = hospital.coords;
    
    // CORRECTED MAP URL LOGIC
    const mapQuery = `${hospital.name}, ${hospital.address}`;
    const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${encodeURIComponent(mapQuery)}`;
    
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    const eta = calculateTheniETA(hospital.distance || 0);
    const etaColor = eta > 20 ? 'text-red-500' : eta > 10 ? 'text-yellow-500' : 'text-green-500';

    const MAX_DIST = getMaxTransferDistance();
    const isTooFar = (hospital.distance || 0) > MAX_DIST;
    const etaDisplay = isTooFar ? 'TOO FAR' : `${eta.toFixed(0)} min`;
    const etaColorDisplay = isTooFar ? 'text-gray-500' : etaColor;
    
    const [showContent, setShowContent] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 800);
        return () => clearTimeout(timer);
    }, [hospital.id]);

    if (!showContent) {
        return (
            <div className="w-full max-w-sm h-72 bg-white rounded-xl shadow-2xl flex items-center justify-center p-8">
                <FaSpinner className="animate-spin text-blue-600" size={32} />
                <p className="text-gray-700 ml-3">Estimating Travel & Bed Status...</p>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 flex-grow space-y-3">
                
                {isThisHospitalBlocked && (
                    <div className="p-3 bg-red-100 border-l-4 border-red-500 rounded-lg text-red-700 font-bold flex items-center gap-2">
                        <FaExclamationTriangle size={18} /> 
                        <p>EMERGENCY DIVERSION: Facility temporarily not accepting routine patients.</p>
                    </div>
                )}
                
                <div className='flex justify-between items-start'>
                    <h2 className="text-xl font-bold text-gray-800 pr-2">{hospital.name}</h2>
                    <div className='flex gap-2 flex-shrink-0'>
                        <a href={`tel:${hospital.helpline}`} className='flex items-center justify-center h-8 w-8 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200' title="Call Helpline"><FaPhone/></a>
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className='flex items-center justify-center h-8 w-8 bg-green-100 text-green-800 rounded-full hover:bg-green-200' title="Get Directions"><FaDirections/></a>
                    </div>
                </div>
                <div className="h-32 w-full relative flex-shrink-0 rounded-lg overflow-hidden border">
                    <iframe title={`Map of ${hospital.name}`} width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={mapSrc}></iframe>
                </div>
                
                 <p className="text-xs text-gray-500 -mt-2">{hospital.address}</p>

                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className='p-2 bg-slate-100 rounded-lg'>
                        <p className='text-xs text-gray-500 font-semibold'>Travel Time (ETA)</p>
                        <p className={`font-bold text-xl ${etaColorDisplay}`}>
                            {etaDisplay}
                        </p>
                    </div>
                    <div className='p-2 bg-slate-100 rounded-lg'><p className='text-xs text-gray-500 font-semibold'>{t('beds.available')}</p><p className='font-bold text-xl text-emerald-600'>{Math.floor(hospital.availableBeds)}</p></div>
                    <div className='p-2 bg-slate-100 rounded-lg'><p className='text-xs text-gray-500 font-semibold'>{t('icu.available')}</p><p className='font-bold text-xl text-rose-600'>{Math.floor(hospital.availableICUBeds)}</p></div>
                    <div className='p-2 bg-slate-100 rounded-lg'><p className='text-xs text-gray-500 font-semibold'>Consulting Fee</p><p className='font-bold text-base'>₹{hospital.minConsultCharge}</p></div>
                </div>
                 <div className='flex items-center justify-center gap-2 text-sky-600 font-bold bg-sky-50 p-2 rounded-lg'><FaStethoscope/>{hospital.availableHours.includes("24x7") ? t('emergency.247') : 'Limited OPD Hours'}</div>
            </div>
            <div className='p-3 border-t bg-slate-50 flex-shrink-0'>
                <button onClick={onBack} className='w-full bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700'>Close</button>
            </div>
        </div>
    );
};