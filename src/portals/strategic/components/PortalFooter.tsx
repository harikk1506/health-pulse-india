export const PortalFooter = ({ ping }: { ping: number }) => (
    <footer className="bg-gray-800 text-gray-400 text-[9px] p-0.5 text-center flex-shrink-0 flex justify-between items-center px-4 z-20">
        <span>© 2025 National Bed Occupancy Dashboard. V1.0.0 - RASHTRIYA NITI</span>
        <div className="flex items-center gap-4">
            <span className={`${ping > 500 ? 'text-red-400 animate-pulse' : 'text-green-400'} font-semibold`}>Ping: {ping} ms</span>
            <span>Session IP: 103.48.198.141</span>
        </div>
    </footer>
);