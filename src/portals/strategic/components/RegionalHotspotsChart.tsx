const COLORS = {
    alertRed: '#e53e3e',
    warningOrange: '#dd6b20',
    primaryBlue: '#3182ce',
    textDark: '#2d3748',
    textLight: '#718096',
};

export const RegionalHotspotsChart = ({ stats }: { stats: { region: string, avgOccupancy: number }[] }) => {
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg h-full flex flex-col border border-slate-200">
            <h2 className="text-base font-bold flex items-center gap-2 flex-shrink-0 font-display" style={{ color: COLORS.textDark }}>Zonal Bed Occupancy</h2>
            <div className="flex-grow flex flex-col justify-around gap-1 px-1 pt-1 relative">
                {stats.map(({ region, avgOccupancy }) => {
                    const width = Math.min(100, avgOccupancy);
                    const color = width > 85 ? COLORS.alertRed : width > 75 ? COLORS.warningOrange : COLORS.primaryBlue;
                    return (
                        <div key={region} className="flex items-center gap-2 group/bar">
                            <span className="w-12 text-xs font-bold" style={{ color: COLORS.textLight }}>{region}</span>
                            <div className="flex-grow bg-slate-200 rounded-full h-3.5 relative overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 transform group-hover/bar:brightness-110`} style={{ width: `${width}%`, background: `linear-gradient(to right, ${color}, ${width > 75 ? COLORS.warningOrange : color})` }}>
                                     <span className="text-white text-[9px] font-bold drop-shadow-sm">{avgOccupancy.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div className="absolute top-8 bottom-2 border-l border-dashed" style={{ right: `calc(15%)`, borderColor: COLORS.alertRed, opacity: 0.7 }}>
                     <div className="absolute -top-5 right-0 transform translate-x-1/2 text-[9px] font-bold px-1 rounded bg-red-100 text-red-600">85%</div>
                </div>
            </div>
        </div>
    );
};