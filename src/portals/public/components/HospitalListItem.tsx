// src/portals/public/components/HospitalListItem.tsx
import { FaHeartbeat, FaStar } from 'react-icons/fa';
import { BiPlusMedical } from 'react-icons/bi';
import type { LiveHospitalData } from '../../../types';

export const HospitalListItem = ({ hospital, onSelect }: { hospital: LiveHospitalData; onSelect: () => void; }) => {
    const occupancyColor = hospital.bedOccupancy > 90 ? 'border-rose-500' : hospital.bedOccupancy > 75 ? 'border-amber-500' : 'border-emerald-500';
    const nameSize = hospital.name.length > 40 ? 'text-sm' : 'text-base';
    
    const typeText = hospital.type.split(' ')[0];
    let typeColor = 'bg-gray-100 text-gray-800';
    if (typeText.toLowerCase().includes('government')) { typeColor = 'bg-blue-100 text-blue-800'; } 
    else if (typeText.toLowerCase().includes('private')) { typeColor = 'bg-green-100 text-green-800'; } 
    else if (typeText.toLowerCase().includes('trust')) { typeColor = 'bg-purple-100 text-purple-800'; } 
    
    return (
        <div onClick={onSelect} className={`bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 ${occupancyColor} overflow-hidden flex flex-col relative`}>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h3 
                        className={`${nameSize} font-bold text-gray-800 pr-2 flex-1`} 
                        title={hospital.name} 
                    >
                        {hospital.name}
                    </h3>
                    <div className='text-right flex-shrink-0'>
                        <p className="font-bold text-lg text-blue-600">{hospital.distance ? `${hospital.distance.toFixed(1)} km` : 'N/A'}</p>
                        <p className={`text-xs font-bold mt-0.5 ${hospital.bedOccupancy > 90 ? 'text-rose-500' : 'text-gray-500'}`}>
                            Occ: {hospital.bedOccupancy.toFixed(1)}%
                        </p>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><FaStar className='text-yellow-500'/> {hospital.googleRating.toFixed(1)}</p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{typeText}</span>
                </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-around text-xs font-semibold">
                <span className='flex items-center gap-1 text-emerald-700'><BiPlusMedical/> {Math.floor(hospital.availableBeds)} Beds</span>
                <span className='flex items-center gap-1 text-rose-700'><FaHeartbeat/> {Math.floor(hospital.availableICUBeds)} ICU</span>
            </div>
        </div>
    );
};