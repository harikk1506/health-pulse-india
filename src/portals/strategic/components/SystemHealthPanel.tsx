const COLORS = {
    publicSector: '#06b6d4',
    privateSector: '#6366f1',
    textMedium: '#4a5568',
    textDark: '#2d3748',
};

const ProgressBar = ({ value, color, label }: { value: number, color: string, label: string }) => (
    <div>
        <div className="flex justify-between items-baseline mb-0.5">
            <span className="text-xs font-semibold" style={{ color: COLORS.textMedium }}>{label}</span>
            <span className="text-sm font-bold" style={{color}}>{value.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
             <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }}></div>
        </div>
    </div>
);

export const SystemHealthPanel = ({ stats }: { stats: { publicSectorOccupancy: number, privateSectorOccupancy: number } }) => {
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg h-full flex flex-col border border-slate-200">
             <h2 className="text-base font-bold flex items-center gap-2 font-display" style={{ color: COLORS.textDark }}>National Performance Index</h2>
             <div className="flex-grow flex flex-col justify-around gap-1 mt-1">
                <ProgressBar value={stats.publicSectorOccupancy} color={COLORS.publicSector} label="Public Sector (BOR)" />
                <ProgressBar value={stats.privateSectorOccupancy} color={COLORS.privateSector} label="Private Sector (BOR)" />
            </div>
        </div>
    );
};