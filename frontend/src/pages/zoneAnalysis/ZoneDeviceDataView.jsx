import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Calendar, Code } from 'lucide-react';
import { fetchStreamApi } from '../../utils/api';
import PaginationFooter from '../../components/common/PaginationFooter';
import { useChunkedPagination } from '../../hooks/useChunkedPagination';
import { useDeviceStore } from '../../store/useDeviceStore';

export default function ZoneDeviceDataView() {
    const { deviceId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasAlertFilter, setHasAlertFilter] = useState('true');
    const [timeFilter, setTimeFilter] = useState('24h');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const { deviceLocations } = useDeviceStore();
    const deviceInfo = useMemo(() => {
        if (!deviceLocations || !deviceId) return null;
        return deviceLocations.find(d => String(d.device_id) === String(deviceId));
    }, [deviceLocations, deviceId]);

    const {
        currentPage,
        setCurrentPage,
        rowsPerPage,
        setRowsPerPage,
        hasMoreData,
        setHasMoreData,
        isLoadingMore,
        setIsLoadingMore,
        resetPagination
    } = useChunkedPagination(25);

    useEffect(() => {
        if (!deviceId) return;
        let isMounted = true;
        resetPagination();
        setData([]);

        const loadData = async () => {
            setLoading(true);
            setError(null);
            setIsStreaming(true);
            
            try {
                let sinceDate = new Date();
                if (timeFilter === '24h') {
                    sinceDate.setDate(sinceDate.getDate() - 1);
                } else if (timeFilter === '30d') {
                    sinceDate.setDate(sinceDate.getDate() - 30);
                } else if (timeFilter === '60d') {
                    sinceDate.setDate(sinceDate.getDate() - 60);
                } else if (timeFilter === 'custom' && customStartDate) {
                    sinceDate = new Date(customStartDate + "T00:00:00.000");
                }

                if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
                    setLoading(false);
                    setIsStreaming(false);
                    return;
                }

                let filterQuery = hasAlertFilter !== 'all' ? `&has_alert=${hasAlertFilter}` : '';
                filterQuery += `&since_timestamp=${sinceDate.toISOString()}`;
                
                if (timeFilter === 'custom' && customEndDate) {
                    filterQuery += `&before_timestamp=${new Date(customEndDate + "T23:59:59.999").toISOString()}`;
                }

                await fetchStreamApi(
                    `/Deviceinformation/device/${deviceId}/data?stream=true&limit=1000${filterQuery}`,
                    (chunk) => {
                        if (isMounted && chunk && chunk.length > 0) {
                            setData(prev => {
                                const newIds = new Set(chunk.map(c => c.data_id));
                                const filteredPrev = prev.filter(p => !newIds.has(p.data_id));
                                return [...filteredPrev, ...chunk];
                            });
                        }
                    },
                    () => {
                        if (isMounted) {
                            setLoading(false);
                            setIsStreaming(false);
                        }
                    },
                    (err) => {
                        if (isMounted) {
                            console.error("Failed to fetch device data stream:", err);
                            setError(err.message || "Failed to load data");
                            setLoading(false);
                            setIsStreaming(false);
                        }
                    }
                );
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to fetch device data:", err);
                    setError(err.message || "Failed to load data");
                    setLoading(false);
                    setIsStreaming(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [deviceId, hasAlertFilter, timeFilter, customStartDate, customEndDate]);

    useEffect(() => {
        if (data.length > 0) {
            setHasMoreData(data.length >= 1000 && (data.length % 1000 === 0));
        } else {
            setHasMoreData(false);
        }
    }, [data.length, setHasMoreData]);

    const loadMoreData = async () => {
        if (!hasMoreData || isLoadingMore || data.length === 0) return;
        setIsLoadingMore(true);
        
        try {
            const lastAlert = data[data.length - 1];
            const beforeTimestamp = lastAlert.reading_timestamp;
            let filterQuery = hasAlertFilter !== 'all' ? `&has_alert=${hasAlertFilter}` : '';
            
            let sinceDate = new Date();
            if (timeFilter === '24h') {
                sinceDate.setDate(sinceDate.getDate() - 1);
            } else if (timeFilter === '30d') {
                sinceDate.setDate(sinceDate.getDate() - 30);
            } else if (timeFilter === '60d') {
                sinceDate.setDate(sinceDate.getDate() - 60);
            } else if (timeFilter === 'custom' && customStartDate) {
                sinceDate = new Date(customStartDate + "T00:00:00.000");
            }
            filterQuery += `&since_timestamp=${sinceDate.toISOString()}`;
            
            await fetchStreamApi(
                `/Deviceinformation/device/${deviceId}/data?stream=true&before_timestamp=${beforeTimestamp}&limit=1000${filterQuery}`,
                (chunk) => {
                    if (chunk && chunk.length > 0) {
                        setData(prev => {
                            const newIds = new Set(chunk.map(c => c.data_id));
                            const filteredPrev = prev.filter(p => !newIds.has(p.data_id));
                            return [...filteredPrev, ...chunk];
                        });
                    }
                },
                () => {
                    setIsLoadingMore(false);
                },
                (err) => {
                    console.error("Failed to load more data stream:", err);
                    setIsLoadingMore(false);
                }
            );
        } catch (err) {
            console.error("Failed to load more data:", err);
            setIsLoadingMore(false);
        }
    };

    const paginatedData = useMemo(() => {
        if (rowsPerPage === 'All') return data;
        const start = (currentPage - 1) * rowsPerPage;
        return data.slice(start, start + rowsPerPage);
    }, [data, currentPage, rowsPerPage]);

    const totalPages = rowsPerPage === 'All' ? 1 : Math.ceil(data.length / rowsPerPage);

    return (
        <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl shadow-sm border border-slate-200/60 mb-8 transition-all duration-500 flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Device Data: {deviceId}
                            {deviceInfo && deviceInfo.vendor_name && (
                                <span className="text-sm font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 ml-2 shadow-sm">
                                    Vendor: {deviceInfo.vendor_name}
                                </span>
                            )}
                            {isStreaming && (
                                <div className="flex items-center gap-2 px-2 py-1 rounded bg-indigo-50 border border-indigo-100">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Streaming</span>
                                </div>
                            )}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Showing historical records for this device
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                    <select 
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-slate-700 shadow-sm"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="60d">Last 60 Days</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    
                    {timeFilter === 'custom' && (
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl px-2 py-1 shadow-sm transition-all">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">From</span>
                            <div className="relative flex items-center justify-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer group/date">
                                <div className="text-slate-700 font-semibold text-sm pointer-events-none">
                                    {customStartDate ? customStartDate.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                                </div>
                                <Calendar size={13} className="text-slate-400 pointer-events-none group-hover/date:text-indigo-500 transition-colors" />
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                            </div>
                            <div className="h-4 w-px bg-slate-300 mx-1"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To</span>
                            <div className="relative flex items-center justify-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer group/date">
                                <div className="text-slate-700 font-semibold text-sm pointer-events-none">
                                    {customEndDate ? customEndDate.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                                </div>
                                <Calendar size={13} className="text-slate-400 pointer-events-none group-hover/date:text-indigo-500 transition-colors" />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    <select 
                        value={hasAlertFilter}
                        onChange={(e) => setHasAlertFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-slate-700 shadow-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="true">hasAlert: True</option>
                        <option value="false">hasAlert: False</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm relative min-h-[400px]">
                {loading && data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <RefreshCw className="animate-spin text-indigo-500" size={32} />
                        <span className="text-slate-500 font-medium">Loading data...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl max-w-md text-center border border-red-200">
                            <p className="font-bold mb-1">Error Loading Data</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <p className="font-medium text-lg">No data found</p>
                        <p className="text-sm mt-1">There are no records for this device yet.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">hasAlert</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Alert Count</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, idx) => (
                                <tr 
                                    key={row.data_id || idx} 
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/zone-analysis/data/${row.data_id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                        {row.reading_timestamp ? new Date(row.reading_timestamp).toLocaleString('en-GB') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {row.has_alert ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                                True
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                False
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                                        {row.highest_severity || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 text-right">
                                        {row.alert_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                            title="View Data JSON"
                                        >
                                            <Code size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            {!loading && data.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4 shrink-0">
                    <PaginationFooter 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        setCurrentPage={setCurrentPage}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        totalItems={data.length}
                        hasMoreData={hasMoreData}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={loadMoreData}
                        isStreaming={isStreaming}
                    />
                </div>
            )}
        </div>
    );
}
