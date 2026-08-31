import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronUp, AlertTriangle, TrainTrack, Scale, Eye } from 'lucide-react';
import { fetchApi } from '../../utils/api';
import PaginationFooter from '../../components/common/PaginationFooter';
import { useChunkedPagination } from '../../hooks/useChunkedPagination';

export default function UnevenLoadedOverview() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
    const [timeFilter, setTimeFilter] = useState(searchParams.get('timeFilter') || '24h');
    const [sortDirection, setSortDirection] = useState(searchParams.get('sortDirection') || 'desc');

    useEffect(() => {
        const params = new URLSearchParams();
        if (timeFilter) params.set('timeFilter', timeFilter);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (sortDirection) params.set('sortDirection', sortDirection);
        setSearchParams(params, { replace: true });
    }, [timeFilter, startDate, endDate, sortDirection, setSearchParams]);
    
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const [backendPage, setBackendPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [expandedCards, setExpandedCards] = useState({});
    
    const {
        currentPage,
        setCurrentPage,
        rowsPerPage,
        setRowsPerPage,
        resetPagination
    } = useChunkedPagination(25);

    // Fetch data function
    const fetchReport = async (pageNum = 1, overrideTimeFilter = null, overrideSortDirection = null) => {
        const activeFilter = overrideTimeFilter || timeFilter;
        const activeSort = overrideSortDirection || sortDirection;
        
        if (activeFilter === 'custom' && (!startDate || !endDate)) {
            setError('Please select both start and end dates.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const body = {
                timeFilter: activeFilter,
                startDate: activeFilter === 'custom' ? new Date(startDate).toISOString() : undefined,
                endDate: activeFilter === 'custom' ? new Date(endDate).toISOString() : undefined,
                page: pageNum,
                limit: 1000,
                sortDirection: activeSort
            };

            const response = await fetchApi('/Analysis/variation-report', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (response && response.success) {
                const fetchedData = response.data || [];
                
                if (pageNum === 1) {
                    setData(fetchedData);
                } else {
                    setData(prev => {
                        // Prevent duplicates by checking data_id + rsno
                        const existingKeys = new Set(prev.map(p => `${p.data_id}_${p.rsno}`));
                        const newItems = fetchedData.filter(p => !existingKeys.has(`${p.data_id}_${p.rsno}`));
                        return [...prev, ...newItems];
                    });
                }
                
                if (response.hasMore === false) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            } else {
                setError(response?.message || 'Failed to fetch variation report.');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while fetching data.');
        } finally {
            setLoading(false);
        }
    };

    // Unified fetch effect for filter and sort changes
    useEffect(() => {
        if (timeFilter !== 'custom' || (timeFilter === 'custom' && startDate && endDate)) {
            setData([]);
            setExpandedCards({});
            setBackendPage(1);
            setHasMore(true);
            resetPagination();
            fetchReport(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeFilter, startDate, endDate, sortDirection]);

    const toggleCard = (dataId) => {
        setExpandedCards(prev => ({
            ...prev,
            [dataId]: !prev[dataId]
        }));
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        const d = new Date(isoString);
        return d.toLocaleString();
    };

    // Group the raw data by Train (data_id)
    const groupedByTrain = React.useMemo(() => {
        const groups = {};
        for (const item of data) {
            if (!groups[item.data_id]) {
                groups[item.data_id] = {
                    data_id: item.data_id,
                    reading_timestamp: item.reading_timestamp,
                    device_id: item.device_id,
                    rsnos: []
                };
            }
            groups[item.data_id].rsnos.push(item);
        }
        return Object.values(groups).sort((a, b) => {
            const timeA = new Date(a.reading_timestamp).getTime();
            const timeB = new Date(b.reading_timestamp).getTime();
            return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        });
    }, [data, sortDirection]);

    // Auto-fetch effect: if we don't have enough grouped trains to fill the current page, fetch more!
    useEffect(() => {
        const canFetch = timeFilter === 'custom' ? (startDate && endDate) : true;
        if (!loading && hasMore && canFetch) {
            const requiredItems = currentPage * (rowsPerPage === 'All' ? 1000 : rowsPerPage);
            if (groupedByTrain.length > 0 && groupedByTrain.length < requiredItems) {
                setBackendPage(prev => {
                    const next = prev + 1;
                    fetchReport(next);
                    return next;
                });
            }
        }
    }, [groupedByTrain.length, loading, hasMore, currentPage, rowsPerPage, startDate, endDate, timeFilter, sortDirection]);

    const displayedTrains = rowsPerPage === 'All' 
        ? groupedByTrain 
        : groupedByTrain.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const [selectedTrain, setSelectedTrain] = useState(null);

    // Render detailed view for a single train pass
    if (selectedTrain) {
        return (
            <div className="flex flex-col h-full space-y-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSelectedTrain(null)}
                        className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                    >
                        &larr; Back to Report
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <TrainTrack className="text-indigo-600" size={28} />
                            Train Pass Details
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Device ID: {selectedTrain.device_id} &bull; Time: {formatDate(selectedTrain.reading_timestamp)}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 space-y-6">
                    {selectedTrain.rsnos.map((rs, rsIdx) => (
                        <div key={rsIdx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Scale className="text-orange-500" size={22} />
                                    RS No: <span className="text-indigo-600">{rs.rsno || 'Unknown'}</span>
                                </h4>
                                <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Avg ILF: {rs.averages?.ilf?.toFixed(2)}</span>
                                    <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Avg Max Dyn: {rs.averages?.maxDynamicLoadTon?.toFixed(2)}</span>
                                    <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Avg of Avg Dyn: {rs.averages?.avgDynamicLoadTon?.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm text-left text-slate-600">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 font-bold">Position</th>
                                            <th className="px-6 py-3 font-bold text-right">ILF</th>
                                            <th className="px-6 py-3 font-bold text-right">ILF Var %</th>
                                            <th className="px-6 py-3 font-bold text-right">Max Dyn Load</th>
                                            <th className="px-6 py-3 font-bold text-right">Max Var %</th>
                                            <th className="px-6 py-3 font-bold text-right">Avg Dyn Load</th>
                                            <th className="px-6 py-3 font-bold text-right">Avg Var %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rs.wheels?.map((wheel, wIdx) => {
                                            const isIlfHigh = wheel.variation_ilf > 10;
                                            const isMaxHigh = wheel.variation_max > 10;
                                            const isAvgHigh = wheel.variation_avg > 10;
                                            
                                            return (
                                                <tr key={wIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-3 font-medium text-slate-800">{wheel.position}</td>
                                                    <td className="px-6 py-3 text-right">{wheel.ilf?.toFixed(2)}</td>
                                                    <td className={`px-6 py-3 text-right font-bold ${isIlfHigh ? 'text-red-600 bg-red-50/50' : 'text-slate-500'}`}>
                                                        {wheel.variation_ilf?.toFixed(1)}%
                                                    </td>
                                                    <td className="px-6 py-3 text-right">{wheel.maxDynamicLoadTon?.toFixed(2)}</td>
                                                    <td className={`px-6 py-3 text-right font-bold ${isMaxHigh ? 'text-red-600 bg-red-50/50' : 'text-slate-500'}`}>
                                                        {wheel.variation_max?.toFixed(1)}%
                                                    </td>
                                                    <td className="px-6 py-3 text-right">{wheel.avgDynamicLoadTon?.toFixed(2)}</td>
                                                    <td className={`px-6 py-3 text-right font-bold ${isAvgHigh ? 'text-red-600 bg-red-50/50' : 'text-slate-500'}`}>
                                                        {wheel.variation_avg?.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Sum Row */}
                                        <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-200">
                                            <td className="px-6 py-3 text-right uppercase text-xs tracking-wider">Sum</td>
                                            <td className="px-6 py-3 text-right text-indigo-700">
                                                {rs.wheels?.reduce((acc, w) => acc + (w.ilf || 0), 0).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3"></td>
                                            <td className="px-6 py-3 text-right text-indigo-700">
                                                {rs.wheels?.reduce((acc, w) => acc + (w.maxDynamicLoadTon || 0), 0).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3"></td>
                                            <td className="px-6 py-3 text-right text-indigo-700">
                                                {rs.wheels?.reduce((acc, w) => acc + (w.avgDynamicLoadTon || 0), 0).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const handleSortToggle = () => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    // Main Table View
    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" size={28} />
                        Uneven Loaded Report
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Trains showing significant wheel load variations ({">"} 10%)
                    </p>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-wrap items-end gap-4 shrink-0">
                <div className="flex flex-col w-full md:w-auto min-w-[200px]">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Time Filter</label>
                    <select
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none transition-all cursor-pointer"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="60d">Last 60 Days</option>
                        <option value="custom">Custom Date Range</option>
                    </select>
                </div>

                {timeFilter === 'custom' && (
                    <>
                        <div className="flex flex-col w-full md:w-auto">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                            <input 
                                type="datetime-local" 
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none transition-all"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col w-full md:w-auto">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                            <input 
                                type="datetime-local" 
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none transition-all"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                    </>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-1 flex flex-col overflow-hidden">
                {groupedByTrain.length === 0 && loading && !error && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white/50 border-dashed">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                        <p>Loading uneven loaded trains...</p>
                    </div>
                )}

                {groupedByTrain.length === 0 && !loading && !error && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white/50 border-dashed">
                        <Scale size={48} className="mb-4 text-slate-300" strokeWidth={1.5} />
                        <p>No uneven loaded trains found for the selected date range.</p>
                    </div>
                )}

                {groupedByTrain.length > 0 && (
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th 
                                        className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-200/50 transition-colors group select-none"
                                        onClick={handleSortToggle}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Timestamp
                                            {sortDirection === 'desc' ? (
                                                <ChevronDown size={14} className="text-indigo-600" />
                                            ) : (
                                                <ChevronUp size={14} className="text-indigo-600" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 font-bold">Device ID</th>
                                    <th className="px-6 py-4 font-bold text-center">Anomalous Rolling Stock</th>
                                    <th className="px-6 py-4 font-bold text-center">Data</th>
                                    <th className="px-6 py-4 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedTrains.map((train, index) => (
                                    <tr 
                                        key={index} 
                                        onClick={() => setSelectedTrain(train)}
                                        className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                                            {formatDate(train.reading_timestamp)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-indigo-600 font-semibold">{train.device_id}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-orange-100 text-orange-700 py-1 px-3 rounded-full text-xs font-bold">
                                                {train.rsnos.length}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/alerts/data/${train.data_id}`);
                                                }}
                                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors inline-flex items-center justify-center"
                                                title="View Raw Data"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
                                                View Details &rarr;
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {groupedByTrain.length > 0 && (
                    <PaginationFooter
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        totalItems={groupedByTrain.length}
                        totalPages={Math.ceil(groupedByTrain.length / rowsPerPage)}
                        hasMoreData={hasMore}
                        isLoadingMore={loading}
                        onLoadMore={async () => {
                            if (hasMore) {
                                const next = backendPage + 1;
                                setBackendPage(next);
                                await fetchReport(next);
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}
