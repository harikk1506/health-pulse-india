// src/portals/public/components/FilterBar.tsx
import { FaSearch, FaMapMarkerAlt, FaProcedures, FaCompass, FaLandmark, FaBuilding, FaTimes, FaUndo } from 'react-icons/fa';
import type { Filters } from '../../../../types';

interface FilterBarProps {
    filters: Filters;
    setFilters: (f: Filters) => void;
    onReset: () => void;
}

export const FilterBar = ({ filters, setFilters, onReset }: FilterBarProps) => {
    
    const toggleType = (type: string) => {
        const newTypes = filters.types.includes(type)
            ? filters.types.filter(t => t !== type)
            : [...filters.types, type];
        setFilters({ ...filters, types: newTypes });
    };

    const clearSearch = () => {
        setFilters({ ...filters, searchTerm: '' });
    };

    return (
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 py-2 px-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                
                {/* LEFT SIDE: SEARCH + CONTROL ZONE */}
                <div className="flex w-full md:w-auto items-center">
                    
                    {/* 1. GOOGLE MAPS STYLE SEARCH */}
                    <div className="relative flex-grow md:w-72 shadow-sm rounded-full bg-white border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex items-center h-9 overflow-hidden">
                        <div className="pl-3 pr-2 text-slate-400">
                            <FaSearch className="text-xs" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search hospitals..."
                            className="flex-grow bg-transparent text-slate-700 placeholder-slate-400 focus:outline-none text-xs font-medium h-full"
                            value={filters.searchTerm}
                            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                        />
                        
                        {/* 'X' Clear Button */}
                        {filters.searchTerm && (
                            <button onClick={clearSearch} className="p-2 text-slate-400 hover:text-slate-600">
                                <FaTimes className="text-xs" />
                            </button>
                        )}

                        <div className="flex items-center gap-1.5 pr-3 border-l border-slate-100 pl-3 h-full bg-slate-50/50">
                            <FaMapMarkerAlt className="text-red-500 text-[10px]" />
                            <span className="text-[10px] font-bold text-slate-600">Theni</span>
                        </div>
                    </div>

                    {/* 2. RESET BUTTON (Ghost Pill Style with Spacing) */}
                    {/* ml-6 adds the spacing to align with "D" in Dashboard above */}
                    <button 
                        onClick={onReset}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 h-9 ml-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors border border-transparent hover:border-slate-300 cursor-pointer"
                        title="Reset Filters & Rewind to Top"
                    >
                        <FaUndo className="text-xs" />
                        <span className="text-xs font-bold hidden sm:inline">Reset</span>
                    </button>
                </div>

                {/* 3. FILTER PILLS (Right Side) */}
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pt-2 md:pt-0">
                    <button 
                        onClick={() => setFilters({...filters, nearby: !filters.nearby})}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                            filters.nearby ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                        <FaCompass /> Nearby
                    </button>

                    <button 
                        onClick={() => setFilters({...filters, hasICU: !filters.hasICU})}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                            filters.hasICU ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                        <FaProcedures /> ICU Available
                    </button>

                    <button 
                        onClick={() => toggleType('Government')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                            filters.types.includes('Government') ? 'bg-sky-700 text-white border-sky-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                        <FaLandmark /> Govt
                    </button>

                    <button 
                        onClick={() => toggleType('Private')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                            filters.types.includes('Private') ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                        <FaBuilding /> Private
                    </button>
                </div>
            </div>
        </div>
    );
};