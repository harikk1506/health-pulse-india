import { useState, useEffect } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';

export const LoadingScreen = () => {
    const messages = ["Acquiring GPS Signal...", "Fetching Live Hospital Data...", "Calculating Routes..."];
    const [message, setMessage] = useState(messages[0]);

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % messages.length;
            setMessage(messages[i]);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-800 flex flex-col items-center justify-center z-50">
            <div className="gps-pulse">
                <FaMapMarkerAlt className="text-red-500 text-5xl"/> 
            </div>
            <p className="mt-4 text-white font-semibold animate-pulse">{message}</p>
        </div>
    );
};