import React from 'react';
import { AlertTriangle, Activity } from 'lucide-react'; // Removing ArrowUp/Down imports

interface SystemHealthPanelProps {
    regionalOccupancy: Record<string, number>;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ regionalOccupancy }) => {
    const regions = Object.entries(regionalOccupancy).sort(([, a], [, b]) => b - a);

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 backdrop-blur-sm h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-400" />
                <h3 className="text-slate-100 font-semibold">Zonal Analytics</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {regions.map(([region, occupancy]) => {
                    // FIX: Adjusted Thresholds to match new reality (Target 62% is normalish, >85 critical)
                    const isCritical = occupancy > 85;
                    const isWarning = occupancy > 75;
                    
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
                                    <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                                )}
                            </div>
                            
                            <div className="flex items-end justify-between">
                                <span className={`text-xl font-bold ${
                                    isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                    {occupancy.toFixed(1)}%
                                </span>
                                {/* ARROWS REMOVED FROM HERE TOO */}
                            </div>
                            
                            <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, occupancy)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};