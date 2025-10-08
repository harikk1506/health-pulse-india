import { FaArrowUp, FaArrowDown, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { IconType } from 'react-icons';

const COLORS = {
    alertRed: '#e53e3e',
    safeGreen: '#38a169',
};

export const KpiMetric = ({ title, value, unit = '', color, icon: Icon, isAlert, onClick, trend }: { title: string, value: string, unit?: string, color: string, icon: IconType, isAlert: boolean, onClick?: () => void, trend: string }) => {
    const TrendIcon = trend === 'up' ? FaArrowUp : FaArrowDown;
    let trendColor = '';
    if (trend === 'up') {
        trendColor = ['Adequate Resources', 'Patient Experience'].includes(title) ? COLORS.safeGreen : COLORS.alertRed;
    } else if (trend === 'down') {
        trendColor = ['Adequate Resources', 'Patient Experience'].includes(title) ? COLORS.alertRed : COLORS.safeGreen;
    }

    return (
        <div onClick={onClick} className={`text-center group transition-all duration-300 relative px-2 ${onClick ? 'cursor-pointer' : ''}`}>
            {onClick && <FaInfoCircle className="absolute top-0 right-1 text-gray-300 group-hover:text-blue-500 transition-colors" size={10} />}
            <p className="text-[11px] font-semibold text-gray-500 flex items-center justify-center gap-1 leading-tight h-6 truncate">
                <Icon size={10} style={{ color }}/> <span>{title}</span>
            </p>
            <div className="flex items-center justify-center gap-1">
              {isAlert && <FaExclamationTriangle className="text-rose-500 animate-pulse" />}
              <p className="font-bold text-xl" style={{ color }}>{value}<span className="text-sm font-semibold">{unit}</span></p>
              {trend && trend !== 'stable' && <TrendIcon style={{ color: trendColor }} size={10} />}
            </div>
        </div>
    );
};