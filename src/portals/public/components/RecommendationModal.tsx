import { useState, useEffect } from 'react';
import { FaAward, FaSpinner, FaTimes } from 'react-icons/fa';
import { useTranslations } from '../../../hooks/useTranslations';
import type { LiveHospitalData } from '../../../types';

export const RecommendationModal = ({ recommendations, onClose, onSelectHospital }: { recommendations: LiveHospitalData[], onClose: () => void, onSelectHospital: (h: LiveHospitalData) => void }) => {
    const t = useTranslations();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col">
            <div className="p-4 bg-blue-700 text-white border-b border-blue-800 flex justify-between items-center rounded-t-xl">
                <h2 className="text-xl font-bold flex items-center gap-2"><FaAward/> {t('recommend.title')}</h2>
                <button onClick={onClose}><FaTimes size={16} /></button>
            </div>
            {isLoading ? (
                <div className="p-4 space-y-3 flex flex-col items-center justify-center h-48">
                    <FaSpinner className="animate-spin text-blue-600" size={32} />
                    <p className="text-gray-600 font-semibold mt-2">Calculating best options...</p>
                </div>
            ) : (
                <div className='p-4 space-y-3'>
                    {recommendations.map((h, i) => (
                        <div key={h.id} onClick={() => onSelectHospital(h)} className="p-3 border rounded-lg hover:bg-gray-100 cursor-pointer">
                            <p className="font-bold text-lg">{i + 1}. {h.name}</p>
                            <div className="text-sm flex justify-between items-center mt-1">
                                <span>~{(h.eta ?? 0).toFixed(0)} min ETA</span>
                                <span className="font-bold text-green-600">{Math.floor(h.availableBeds)} Beds</span>
                                <span className="font-bold text-rose-600">{Math.floor(h.availableICUBeds)} ICU</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};