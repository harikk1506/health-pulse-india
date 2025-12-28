// src/portals/public/components/HospitalListItem.tsx
import { FaHeartbeat, FaStar, FaLandmark, FaBuilding } from 'react-icons/fa';
import { BiPlusMedical } from 'react-icons/bi';
import type { LiveHospitalData } from '../../../types';

export const HospitalListItem = ({ hospital, onSelect }: { hospital: LiveHospitalData; onSelect: () => void; }) => {
    
    // Status Logic
    const isFull = hospital.bedStatus === 'AT CAPACITY';
    
    // Border Logic
    const borderClass = isFull 
        ? 'border-2 border-slate-900 bg-slate-50'  // Black Border for Full
        : 'border border-slate-200 bg-white hover:border-blue-300'; // Standard

    // Color Tiers
    let occupancyColor = 'text-emerald-600';
    if (hospital.bedOccupancy > 90) occupancyColor = 'text-rose-600';
    else if (hospital.bedOccupancy > 75) occupancyColor = 'text-amber-600';

    const icuColor = hospital.availableICUBeds < 1 ? 'text-rose-600' : 'text-blue-600';
    const bedColor = Math.floor(hospital.availableBeds) <= 0 ? 'text-slate-400' : 'text-emerald-600';
    const bedTextClass = Math.floor(hospital.availableBeds) <= 0 ? 'text-slate-500 font-medium' : 'text-slate-700 font-bold';

    const isGovt = hospital.type.toLowerCase().includes('government');
    const TypeIcon = isGovt ? FaLandmark : FaBuilding;

    return (
        <div 
            onClick={onSelect} 
            className={`h-full ${borderClass} rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between group`}
        >
            <div className="p-3 flex-grow flex flex-col">
                {/* TOP ROW */}
                <div className="flex justify-between items-start gap-2">
                    {/* Name Section (Grow to push bottom down) */}
                    <div className="w-[75%] flex flex-col">
                        <div className="flex items-center gap-1 mb-1">
                            <TypeIcon className="text-slate-400 text-[10px]" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {isGovt ? 'Govt' : 'Pvt'}
                            </span>
                        </div>
                        
                        {/* NAME: Line Clamp 3 + Padding for Descenders */}
                        <h3 
                            className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-700 line-clamp-3 pb-0.65" 
                            title={hospital.name}
                            style={{ minHeight: '3.2em' }} // Reserve space for 2 lines visually to align rows
                        >
                            {hospital.name}
                        </h3>
                        
                        <div className="flex items-center gap-1 mt-auto pt-2">
                            <FaStar className="text-amber-400 text-[10px]" />
                            <span className="text-[11px] font-semibold text-slate-500">{hospital.googleRating.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Status Section (Fixed Width) */}
                    <div className="w-[25%] flex flex-col items-end">
                        {isFull ? (
                            <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mb-1">
                                FULL
                            </span>
                        ) : (
                            <span className={`text-xs font-extrabold mb-1 ${occupancyColor}`}>
                                Occ: {hospital.bedOccupancy.toFixed(0)}%
                            </span>
                        )}
                        <span className="font-bold text-sm text-slate-400 whitespace-nowrap">
                            {hospital.distance ? hospital.distance.toFixed(0) : '0'} km
                        </span>
                    </div>
                </div>
            </div>

            {/* BOTTOM ROW (Pinned) */}
            <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5">
                    <BiPlusMedical className={`${bedColor} text-xs`} />
                    <span className={bedTextClass}>
                        {Math.floor(hospital.availableBeds) <= 0 ? 'Waitlist (0)' : `${Math.floor(hospital.availableBeds)} Beds`}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <FaHeartbeat className={`${icuColor} text-xs`} />
                    <span className={hospital.availableICUBeds < 1 ? 'text-rose-700 font-bold' : 'text-slate-600 font-bold'}>
                        {Math.floor(hospital.availableICUBeds)} ICU
                    </span>
                </div>
            </div>
        </div>
    );
};