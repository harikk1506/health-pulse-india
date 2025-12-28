import { useState, useEffect } from 'react';
import { useTranslations } from '../../../hooks/useTranslations';

export const PortalFooterPublic = () => {
    const t = useTranslations();
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setLastUpdated(new Date()), 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <footer className="bg-gray-800 text-gray-400 text-[10px] p-0 text-center flex-shrink-0 flex justify-between items-center px-4">
            <span>© 2025 National Bed Occupancy Dashboard. V1.0.0 - {t('portal.public')} Gateway</span>
            <div className="flex items-center gap-4">
                <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
                <span>Session IP: 157.119.119.30</span>
            </div>
        </footer>
    );
};