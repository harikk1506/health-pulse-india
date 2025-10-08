import { FaClock, FaSitemap } from 'react-icons/fa';

export const StrategicSidebar = ({ isCollapsed, lastUpdated }: { isCollapsed: boolean, lastUpdated: string }) => {
    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col shadow-2xl flex-shrink-0 h-full transition-all duration-300 z-10`}>
            <div className={`p-4 bg-slate-800 flex items-center border-b border-slate-700 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                <div className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">SC</div>
                {!isCollapsed && ( 
                    <div className="ml-3"> 
                        <p className="text-sm font-semibold text-white">Strategic Command</p> 
                        <p className="text-xs text-gray-300">MoHFW</p>
                        <div className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-green-600 inline-block">Active Session</div>
                    </div> 
                )}
            </div>
            <nav className="flex-grow p-4 space-y-1">
                <button 
                    className={`flex items-center gap-3 p-3 rounded-lg w-full text-left text-sm transition-colors bg-orange-500 font-bold`} 
                    title="National Overview"
                >
                    <FaSitemap size={20} /> 
                    {!isCollapsed && <span className="truncate">National Overview</span>} 
                </button> 
            </nav>
            {!isCollapsed && (
                <div className="p-4 mt-auto border-t border-gray-700">
                    <div className='bg-gray-800 rounded-lg p-3 text-center'>
                        <p className='text-xs font-bold text-gray-400 flex items-center justify-center gap-1'><FaClock/> Live Data Feed</p>
                        <p className={`text-sm font-semibold text-green-400`}>Last Updated: {lastUpdated}</p>
                    </div>
                </div>
            )}
        </div>
    );
};