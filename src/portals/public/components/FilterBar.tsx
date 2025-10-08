import { useState, useRef } from 'react';
import { FaFilter, FaRedo, FaSort, FaChevronUp, FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';
import { CSSTransition } from 'react-transition-group';
import { useTranslations } from '../../../hooks/useTranslations';
import type { Filters, SortKey } from '../../../types';

const useOutsideClick = (ref: React.RefObject<HTMLDivElement>, callback: () => void) => {
    // Implementation from previous steps
};

export const FilterBar = ({ filters, setFilters, sortKey, setSortKey, sortDirection, setSortDirection }:
    { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>, sortKey: SortKey, setSortKey: (sk: SortKey) => void, sortDirection: 'asc' | 'desc', setSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>> }) => {
    const t = useTranslations();
    const [isFilterOpen, setFilterOpen] = useState(false);
    const [isSortOpen, setSortOpen] = useState(false);
    const filterContainerRef = useRef<HTMLDivElement>(null);
    const sortContainerRef = useRef<HTMLDivElement>(null);

    // useOutsideClick implementation...

    const handleClear = () => { setFilters({ searchTerm: '', types: [], hasICU: false, isOpen247: false, goodPPE: false }); setSortKey('distance'); setSortDirection('asc'); };
    const toggleType = (type: string) => setFilters(p => ({ ...p, types: p.types.includes(type) ? p.types.filter(t => t !== type) : [...p.types, type] }));

    const activeFilterCount = filters.types.length + (filters.hasICU ? 1 : 0) + (filters.isOpen247 ? 1 : 0) + (filters.goodPPE ? 1 : 0);
    
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const SortIcon = sortDirection === 'asc' ? FaChevronUp : FaChevronDown;
    
    return (
        <div className="p-2 bg-white border-b border-slate-200 flex-shrink-0 z-30 sticky top-0">
            <div className="flex items-center justify-between">
                <div className={`relative flex items-center transition-shadow duration-300 rounded-lg shadow-md ring-2 ring-black`} style={{ width: '50%' }}>
                    <FaSearch className="absolute left-3 text-gray-500" />
                    <input
                        type="text"
                        placeholder={t('public.search.placeholder')}
                        value={filters.searchTerm}
                        onChange={e => setFilters(p => ({ ...p, searchTerm: e.target.value }))}
                        className={`p-1.5 pl-10 border-none rounded-lg focus:ring-0 w-full`}
                    />
                    {filters.searchTerm && (
                        <button onClick={() => setFilters(p => ({...p, searchTerm: ''}))} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-800">
                            <FaTimes/>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div ref={filterContainerRef} className='relative z-40'>
                        <button onClick={() => setFilterOpen(p => !p)} className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 hover:bg-blue-100"> <FaFilter className='text-blue-600'/> {activeFilterCount > 0 && <span className='text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5'>{activeFilterCount}</span>} </button>
                        <CSSTransition nodeRef={filterContainerRef} in={isFilterOpen} timeout={200} classNames="dropdown" unmountOnExit>
                           <div className="absolute right-0 top-12 bg-white p-4 rounded-lg shadow-xl border z-40 w-72">
                                <h4 className='font-bold mb-2'>{t('filter.by')}</h4>
                                <div className='grid grid-cols-2 gap-2 text-sm'>
                                    <label className='flex items-center gap-2'><input type='checkbox' checked={filters.hasICU} onChange={() => setFilters(p => ({ ...p, hasICU: !p.hasICU }))}/>{t('filter.icu.available')}</label>
                                    <label className='flex items-center gap-2'><input type='checkbox' checked={filters.isOpen247} onChange={() => setFilters(p => ({ ...p, isOpen247: !p.isOpen247 }))}/>{t('filter.open.247')}</label>
                                    <label className='flex items-center gap-2'><input type='checkbox' checked={filters.goodPPE} onChange={() => setFilters(p => ({ ...p, goodPPE: !p.goodPPE }))}/>{t('filter.good.ppe')}</label>
                                </div>
                                <hr className='my-2'/>
                                <p className='font-semibold text-sm mb-1'>{t('filter.type.title')}</p>
                                <div className='flex gap-2'>
                                    <label className='flex-1 text-center p-2 border rounded-md has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500'><input type='checkbox' className='hidden' checked={filters.types.includes('Government')} onChange={() => toggleType('Government')}/>{t('filter.type.gov')}</label>
                                    <label className='flex-1 text-center p-2 border rounded-md has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500'><input type='checkbox' className='hidden' checked={filters.types.includes('Private')} onChange={() => toggleType('Private')}/>{t('filter.type.private')}</label>
                                </div>
                           </div>
                        </CSSTransition>
                    </div>
                     <div ref={sortContainerRef} className='relative z-40'>
                        <button onClick={() => setSortOpen(p => !p)} className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100"><FaSort className='text-blue-600'/></button>
                         <CSSTransition nodeRef={sortContainerRef} in={isSortOpen} timeout={200} classNames="dropdown" unmountOnExit>
                             <div className="absolute right-0 top-12 bg-white p-2 rounded-lg shadow-xl border z-40 w-56">
                                 <h4 className='font-bold p-2'>{t('sort.by')}</h4>
                                 <button onClick={() => handleSort('distance')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'distance' && 'bg-blue-100'}`}>{t('sort.distance')} {sortKey === 'distance' && <SortIcon size={12}/>}</button>
                                 <button onClick={() => handleSort('availableBeds')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'availableBeds' && 'bg-blue-100'}`}>{t('sort.beds')} {sortKey === 'availableBeds' && (sortDirection === 'desc' ? <FaChevronDown size={12}/> : <FaChevronUp size={12}/>)}</button>
                                 <button onClick={() => handleSort('availableICUBeds')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'availableICUBeds' && 'bg-blue-100'}`}>{t('sort.icu')} {sortKey === 'availableICUBeds' && (sortDirection === 'desc' ? <FaChevronDown size={12}/> : <FaChevronUp size={12}/>)}</button>
                                 <button onClick={() => handleSort('googleRating')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'googleRating' && 'bg-blue-100'}`}>{t('sort.rating')} {sortKey === 'googleRating' && (sortDirection === 'desc' ? <FaChevronDown size={12}/> : <FaChevronUp size={12}/>)}</button>
                                 <button onClick={() => handleSort('currentWaitTime')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'currentWaitTime' && 'bg-blue-100'}`}>{t('sort.wait.time')} {sortKey === 'currentWaitTime' && <SortIcon size={12}/>}</button>
                                 <button onClick={() => handleSort('minConsultCharge')} className={`w-full text-left p-2 rounded flex justify-between items-center ${sortKey === 'minConsultCharge' && 'bg-blue-100'}`}>{t('sort.fee')} {sortKey === 'minConsultCharge' && <SortIcon size={12}/>}</button>
                             </div>
                         </CSSTransition>
                    </div>
                    <button onClick={handleClear} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><FaRedo className='text-red-500'/></button>
                </div>
            </div>
        </div>
    );
}