// src/portals/public/components/AppHeader.tsx
import { FaSignOutAlt, FaRoute } from 'react-icons/fa';

interface AppHeaderProps {
    onRecommendClick: () => void;
    onGoToIntro: () => void;
    onReset: () => void;
}

export const AppHeader = ({ onRecommendClick, onGoToIntro, onReset }: AppHeaderProps) => {
    
    return (
        <header className="bg-white shadow-sm relative z-40">
            {/* Tricolor Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-green-600"></div>

            <div className="max-w-7xl mx-auto px-4 py-1.5 flex justify-between items-center">
                
                {/* Title (Resets Home, No Glow) */}
                <div 
                    className="flex items-center gap-3 cursor-pointer group select-none" 
                    onClick={onReset}
                    title="Reset to Home"
                >
                    <img src="/src/assets/logo.svg" alt="Emblem" className="h-10 w-10 drop-shadow-sm" />
                    <div className="flex flex-col justify-center">
                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 uppercase leading-none tracking-tight transition-colors">
                            National Bed Occupancy Dashboard
                        </h1>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            Ministry of Health & Family Welfare
                        </p>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    
                    {/* AI SmartRoute */}
                    <button 
                        onClick={onRecommendClick}
                        className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg shadow-sm font-bold text-sm transition-all"
                    >
                        <FaRoute className="text-white text-lg" />
                        <span className="hidden md:inline">AI SmartRoute</span>
                    </button>

                    {/* Exit Button Only */}
                    <button 
                        onClick={onGoToIntro}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                    >
                        <FaSignOutAlt />
                        <span>Exit</span>
                    </button>
                </div>
            </div>
            {/* Bottom Border */}
            <div className="h-0.5 w-full bg-blue-900 opacity-80"></div>
        </header>
    );
};