import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Calendar, Code, Database, ChevronDown, Check, Search } from 'lucide-react';
import { fetchStreamApi, fetchApi } from '../../utils/api';
import PaginationFooter from '../../components/common/PaginationFooter';
import { useChunkedPagination } from '../../hooks/useChunkedPagination';
import { useVendorStore } from '../../store/useVendorStore';

export default function AllSensorDataOverview() {
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [timeFilter, setTimeFilter] = useState('24h');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [deviceTypeFilter, setDeviceTypeFilter] = useState([]);
    const [isDeviceTypeDropdownOpen, setIsDeviceTypeDropdownOpen] = useState(false);
    const [availableDeviceTypes, setAvailableDeviceTypes] = useState([]);
    
    const [vendorFilter, setVendorFilter] = useState([]);
    const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
    const { vendors: availableVendors, fetchVendors } = useVendorStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timerId);
    }, [searchTerm]);

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
        let isMounted = true;
        resetPagination();
        setData([]);

        const loadData = async () => {
            setLoading(true);
            setError(null);
            setIsStreaming(true);
            
            try {
                let filterQuery = ``;
                
                if (timeFilter !== 'custom') {
                    filterQuery += `&time=${timeFilter}`;
                } else if (timeFilter === 'custom') {
                    if (!customStartDate || !customEndDate) {
                        setLoading(false);
                        setIsStreaming(false);
                        return;
                    }
                    filterQuery += `&startDate=${customStartDate}&endDate=${customEndDate}`;
                }
                
                if (deviceTypeFilter.length > 0) {
                    filterQuery += `&deviceType=${deviceTypeFilter.join(',')}`;
                }
                
                if (vendorFilter.length > 0) {
                    filterQuery += `&vendor=${vendorFilter.join(',')}`;
                }
                
                if (debouncedSearchTerm) {
                    filterQuery += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
                }

                await fetchStreamApi(
                    `/Deviceinformation/all-sensor-data?stream=true&limit=1000${filterQuery}`,
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
                            console.error("Failed to fetch all sensor data stream:", err);
                            setError(err.message || "Failed to load data");
                            setLoading(false);
                            setIsStreaming(false);
                        }
                    }
                );
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to fetch all sensor data:", err);
                    setError(err.message || "Failed to load data");
                    setLoading(false);
                    setIsStreaming(false);
                }
            }
        };

        const loadDeviceTypes = async () => {
            try {
                const response = await fetchApi('/LiveAlerts/device-types');
                if (response.success && Array.isArray(response.data)) {
                    setAvailableDeviceTypes(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch device types:", err);
            }
        };

        loadDeviceTypes();
        fetchVendors();
        loadData();

        return () => {
            isMounted = false;
        };
    }, [timeFilter, customStartDate, customEndDate, deviceTypeFilter, debouncedSearchTerm, vendorFilter]);

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
            
            let filterQuery = ``;
            if (timeFilter !== 'custom') {
                filterQuery += `&time=${timeFilter}`;
            } else if (timeFilter === 'custom') {
                filterQuery += `&startDate=${customStartDate}&endDate=${customEndDate}`;
            }
            
            if (deviceTypeFilter.length > 0) {
                filterQuery += `&deviceType=${deviceTypeFilter.join(',')}`;
            }
            
            if (vendorFilter.length > 0) {
                filterQuery += `&vendor=${vendorFilter.join(',')}`;
            }
            
            if (debouncedSearchTerm) {
                filterQuery += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
            }
            
            await fetchStreamApi(
                `/Deviceinformation/all-sensor-data?stream=true&before_timestamp=${beforeTimestamp}&limit=1000${filterQuery}`,
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
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-8 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 mb-8 transition-all duration-500 flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            All Sensor Data ( Train Wise )
                            {isStreaming && (
                                <div className="flex items-center gap-2 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Streaming</span>
                                </div>
                            )}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Overview of all historical sensor records across devices
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Device ID..."
                            value={searchTerm}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*$/.test(val)) {
                                    setSearchTerm(val);
                                }
                            }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-10 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 dark:text-slate-300 shadow-sm w-64"
                        />
                    </div>
                    {/* Vendor Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
                            className={`flex items-center justify-between gap-2 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-bold shadow-sm min-w-[140px] transition-all ${
                                isVendorDropdownOpen || vendorFilter.length > 0
                                    ? 'bg-white dark:bg-slate-900 border-2 border-indigo-600 text-slate-700 dark:text-slate-200'
                                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="truncate max-w-[200px]">
                                {vendorFilter.length === 0 
                                    ? 'All Vendors' 
                                    : vendorFilter.length === 1 
                                        ? vendorFilter[0] 
                                        : `${vendorFilter.length} Selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${isVendorDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isVendorDropdownOpen && (
                            <div className="absolute top-full mt-2 w-[340px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden right-0">
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                    <div
                                        onClick={() => setVendorFilter([])}
                                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${vendorFilter.length === 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${vendorFilter.length === 0 ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                            {vendorFilter.length === 0 && <Check size={12} className="text-white" />}
                                        </div>
                                        <span className="text-sm leading-tight">All Vendors</span>
                                    </div>
                                    {availableVendors.map(vendor => {
                                        const isSelected = vendorFilter.includes(vendor);
                                        return (
                                            <div
                                                key={vendor}
                                                onClick={() => {
                                                    setVendorFilter(prev => {
                                                        if (isSelected) {
                                                            return prev.filter(t => t !== vendor);
                                                        } else {
                                                            return [...prev, vendor];
                                                        }
                                                    });
                                                }}
                                                className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                            >
                                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="text-sm leading-tight">{vendor}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* Backdrop to close dropdown */}
                        {isVendorDropdownOpen && (
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsVendorDropdownOpen(false)}
                            />
                        )}
                    </div>

                    {/* Multi-select Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDeviceTypeDropdownOpen(!isDeviceTypeDropdownOpen)}
                            className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-slate-700 dark:text-slate-300 shadow-sm min-w-[140px]"
                        >
                            <span className="truncate max-w-[150px]">
                                {deviceTypeFilter.length === 0 
                                    ? 'All Types' 
                                    : deviceTypeFilter.length === 1 
                                        ? deviceTypeFilter[0] 
                                        : `${deviceTypeFilter.length} Selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${isDeviceTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDeviceTypeDropdownOpen && (
                            <div className="absolute top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                                    <div
                                        onClick={() => setDeviceTypeFilter([])}
                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${deviceTypeFilter.length === 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${deviceTypeFilter.length === 0 ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {deviceTypeFilter.length === 0 && <Check size={12} className="text-white" />}
                                        </div>
                                        <span className="text-sm">All Types</span>
                                    </div>
                                    {availableDeviceTypes.map(type => {
                                        const isSelected = deviceTypeFilter.includes(type);
                                        return (
                                            <div
                                                key={type}
                                                onClick={() => {
                                                    setDeviceTypeFilter(prev => {
                                                        if (isSelected) {
                                                            return prev.filter(t => t !== type);
                                                        } else {
                                                            return [...prev, type];
                                                        }
                                                    });
                                                }}
                                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="text-sm">{type}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* Backdrop to close dropdown */}
                        {isDeviceTypeDropdownOpen && (
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsDeviceTypeDropdownOpen(false)}
                            />
                        )}
                    </div>

                    <select 
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="60d">Last 60 Days</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    
                    {timeFilter === 'custom' && (
                        <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-sm transition-all">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">From</span>
                            <div className="relative flex items-center justify-center gap-1.5 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer group/date">
                                <div className="text-slate-700 dark:text-slate-300 font-semibold text-sm pointer-events-none">
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
                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To</span>
                            <div className="relative flex items-center justify-center gap-1.5 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer group/date">
                                <div className="text-slate-700 dark:text-slate-300 font-semibold text-sm pointer-events-none">
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
                </div>
            </div>

            <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm relative min-h-[400px]">
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
                        <p className="text-sm mt-1">There are no records found for the selected filter.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Device ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Device Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Site</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Has Alert</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Severity</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Alert Count</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedData.map((row, idx) => (
                                <tr 
                                    key={row.data_id || idx} 
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/alerts/data/${row.data_id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {row.reading_timestamp ? new Date(row.reading_timestamp).toLocaleString('en-GB') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                        {row.device_id || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                        {row.device_type_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                        {row.vendor_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                        {row.site || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {row.has_alert ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        {row.highest_severity || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">
                                        {row.alert_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded transition-colors"
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
                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 shrink-0">
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
