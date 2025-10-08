import { useMemo } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import type { LiveHospitalData } from '../../../types';

// FIX: Removed the redundant 'liveData' prop to fix the TypeScript error (TS2322)
export const CriticalHospitalsModal = ({ onClose, criticalHospitals }: { onClose: () => void, criticalHospitals: LiveHospitalData[]}) => {
    const regionalData = useMemo(() => {
        // Define total hospitals per region based on your dataset
        const totalHospitalsByRegion: Record<string, number> = {
            North: 27,
            South: 41,
            East: 24,
            West: 29,
            Central: 29,
        };

        const criticalCounts: Record<string, number> = { North: 0, South: 0, East: 0, West: 0, Central: 0 };
        
        criticalHospitals.forEach(h => {
            if (criticalCounts[h.region] !== undefined) {
                criticalCounts[h.region]++;
            }
        });
        
        return (['North', 'West', 'Central', 'East', 'South'] as const).map(regionName => ({
            name: regionName,
            percentage: Math.round((criticalCounts[regionName] / totalHospitalsByRegion[regionName]) * 100)
        }));
    }, [criticalHospitals]);

    return (
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col">
             <div className="p-4 bg-rose-600 text-white border-b border-rose-700 flex justify-between items-center rounded-t-xl">
                <h2 className="text-xl font-bold flex items-center gap-2 font-display"><FaExclamationTriangle/> Critical Hospitals Distribution</h2>
                <button onClick={onClose}><FaTimes size={16} /></button>
            </div>
            <div className='p-6 space-y-4'>
                <div className="text-center">
                    <p className='font-semibold text-gray-700'>Percentage of hospitals in each zone with bed occupancy over 85%.</p>
                </div>
                <div className="text-lg space-y-2">
                    {regionalData.map(({name, percentage}) => (
                        <div key={name} className="flex justify-between items-center font-bold">
                            <span>{name}:</span>
                            <span className={percentage > 0 ? 'text-rose-600' : 'text-emerald-600'}>{percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};