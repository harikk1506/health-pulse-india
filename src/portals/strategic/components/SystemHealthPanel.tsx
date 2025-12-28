import React, { useRef, useEffect } from 'react';
import { FaExclamationTriangle, FaChartBar, FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

interface SystemHealthPanelProps {
    regionalOccupancy: Record<string, number>;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ regionalOccupancy }) => {
    const regions = Object.entries(regionalOccupancy).sort(([, a], [, b]) => b - a);
    
    // Logic to track previous values for arrow direction
    const prevOccupancyRef = useRef<Record<string, number>>({});

    useEffect(() => {
        prevOccupancyRef.current = regionalOccupancy;
    });

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 backdrop-blur-sm h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <FaChartBar className="w-5 h-5 text-blue-400" />
                <h3 className="text-slate-100 font-semibold">Zonal Analytics</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {regions.map(([region, occupancy]) => {
                    const isCritical = occupancy > 85;
                    const isWarning = occupancy > 75;
                    
                    // Calculate trend
                    const prev = prevOccupancyRef.current[region] || occupancy;
                    const diff = occupancy - prev;
                    
                    return (
                        <div 
                            key={region}
                            className={`p-3 rounded-lg border transition-all ${
                                isCritical 
                                    ? 'bg-red-500/10 border-red-500/30' 
                                    : isWarning
                                        ? 'bg-amber-500/10 border-amber-500/30'
                                        : 'bg-slate-700/30 border-slate-600/30'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-300 font-medium">{region} Zone</span>
                                {isCritical && (
                                    <FaExclamationTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                                )}
                            </div>
                            
                            <div className="flex items-end justify-between">
                                <span className={`text-xl font-bold ${
                                    isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                    {occupancy.toFixed(1)}%
                                </span>
                                
                                {/* ARROWS RESTORED WITH LOGIC */}
                                <div className="flex items-center gap-1">
                                    {diff > 0 ? (
                                        <FaArrowUp size={12} className="text-red-400" />
                                    ) : diff < 0 ? (
                                        <FaArrowDown size={12} className="text-emerald-400" />
                                    ) : (
                                        <FaMinus size={12} className="text-slate-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};