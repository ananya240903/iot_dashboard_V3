import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchApi } from '../../utils/api';
import { io } from 'socket.io-client';
import { Filter, Calendar, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, Search, X, Eye, Check } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate, useLocation } from 'react-router-dom';

import { eChartsTooltipStylesHTML } from '../../utils/echartsUtils';

import SearchableMultiSelect from '../../components/common/SearchableMultiSelect';
import PaginationFooter from '../../components/common/PaginationFooter';
import { useChunkedPagination } from '../../hooks/useChunkedPagination';

export default function LiveAlertsOverview() {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const initialDeviceType = searchParams.get('deviceType');
    const initialSeverity = searchParams.get('severity');

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);

    const {
        currentPage,
        setCurrentPage,
        rowsPerPage,
        setRowsPerPage,
        hasMoreData,
        setHasMoreData,
        isLoadingMore,
        setIsLoadingMore,
        resetPagination,
        getTotalPages
    } = useChunkedPagination(25);


    // Filters
    const [timeFilter, setTimeFilter] = useState('24h');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [jumpToTime, setJumpToTime] = useState('');
    const [availableDeviceTypes, setAvailableDeviceTypes] = useState([]);
    const [selectedDeviceTypes, setSelectedDeviceTypes] = useState(initialDeviceType ? [initialDeviceType] : []);
    const [hideNilRsNo, setHideNilRsNo] = useState(false);
    const [showNilRsNoModal, setShowNilRsNoModal] = useState(false);
    // Site filter (multi-select)
    const [availableSites, setAvailableSites] = useState([]);
    const [selectedSites, setSelectedSites] = useState([]);

    // Vendor filter (multi-select)
    const [availableVendors, setAvailableVendors] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);

    // Severity filter (multi-select)
    const [availableSeverities, setAvailableSeverities] = useState([]);
    const [selectedSeverity, setSelectedSeverity] = useState(initialSeverity ? initialSeverity.split(',') : []);

    const handleViewData = (e, dataId) => {
        e.stopPropagation();
        navigate(`/alerts/data/${dataId}`);
    };

    const [expandedDeviceRows, setExpandedDeviceRows] = useState(new Set());
    const toggleDeviceRow = (e, id) => {
        e.stopPropagation();
        setExpandedDeviceRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: 'reading_timestamp', direction: 'desc' });



    // Fetch data when time filter changes
    useEffect(() => {
        const fetchAlerts = async () => {
            setLoading(true);
            setError(null);
            setCurrentPage(1);

            let sinceDate = new Date();
            if (jumpToTime) {
                sinceDate = new Date(jumpToTime + "T00:00:00.000");
            } else if (timeFilter === '24h') {
                sinceDate.setDate(sinceDate.getDate() - 1);
            } else if (timeFilter === '30d') {
                sinceDate.setDate(sinceDate.getDate() - 30);
            } else if (timeFilter === '60d') {
                sinceDate.setDate(sinceDate.getDate() - 60);
            } else if (timeFilter === 'custom' && customStartDate) {
                sinceDate = new Date(customStartDate + "T00:00:00.000");
            }

            try {
                // If custom is selected but no date is provided yet, don't fetch
                if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
                    setLoading(false);
                    return;
                }

                const deviceQuery = selectedDeviceTypes.length > 0 ? `&deviceTypes=${selectedDeviceTypes.join(',')}` : '';
                const siteQuery = selectedSites.length > 0 ? `&sites=${selectedSites.join(',')}` : '';
                const vendorQuery = selectedVendors.length > 0 ? `&vendors=${selectedVendors.join(',')}` : '';
                const severityQuery = selectedSeverity.length > 0 ? `&severity=${selectedSeverity.join(',')}` : '';
                let beforeQuery = '';
                if (jumpToTime) {
                    beforeQuery = `&before_timestamp=${new Date(jumpToTime + "T23:59:59.999").toISOString()}`;
                } else if (timeFilter === 'custom' && customEndDate) {
                    beforeQuery = `&before_timestamp=${new Date(customEndDate + "T23:59:59.999").toISOString()}`;
                }

                let query = `/LiveAlerts?since=${sinceDate.toISOString()}&limit=1000${deviceQuery}${siteQuery}${vendorQuery}${severityQuery}${beforeQuery}`;
                if (sortConfig.key === 'reading_timestamp') {
                    query += `&sortDirection=${sortConfig.direction}`;
                }
                const response = await fetchApi(query);
                if (response.success) {
                    const fetchedData = response.data || [];
                    setData(fetchedData);
                    setHasMoreData(fetchedData.length === 1000);
                } else {
                    setError("Failed to fetch alerts");
                }
            } catch (err) {
                setError(err.message);
                console.error("LiveAlerts Fetch Error:", err);
            } finally {
                setIsStreaming(false);
                setLoading(false);
            }
        };

        fetchAlerts();
    }, [timeFilter, customStartDate, customEndDate, selectedDeviceTypes, selectedSites, selectedVendors, selectedSeverity, jumpToTime, sortConfig]);

    useEffect(() => {
        const fetchMasterDeviceTypes = async () => {
            try {
                const response = await fetchApi('/LiveAlerts/device-types');
                if (response.success && response.data) {
                    setAvailableDeviceTypes(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch device types:", err);
            }
        };
        const fetchMasterSites = async () => {
            try {
                const response = await fetchApi('/LiveAlerts/sites');
                if (response.success && response.data) {
                    setAvailableSites(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch sites:", err);
            }
        };
        const fetchMasterVendors = async () => {
            try {
                const response = await fetchApi('/LiveAlerts/vendors');
                if (response.success && response.data) {
                    setAvailableVendors(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch vendors:", err);
            }
        };
        const fetchMasterSeverities = async () => {
            try {
                const response = await fetchApi('/LiveAlerts/severities');
                if (response.success && response.data) {
                    setAvailableSeverities(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch severities:", err);
            }
        };
        fetchMasterDeviceTypes();
        fetchMasterSites();
        fetchMasterVendors();
        fetchMasterSeverities();
    }, []);

    const loadMoreData = async () => {
        if (!hasMoreData || isLoadingMore || data.length === 0) return;
        setIsLoadingMore(true);

        try {
            // Get timestamp of the oldest alert we currently have
            const lastAlert = data[data.length - 1];
            const beforeTimestamp = lastAlert.reading_timestamp;

            let sinceDate = new Date();
            if (jumpToTime) {
                sinceDate = new Date(jumpToTime + "T00:00:00.000");
            } else if (timeFilter === '24h') {
                sinceDate.setDate(sinceDate.getDate() - 1);
            } else if (timeFilter === '30d') {
                sinceDate.setDate(sinceDate.getDate() - 30);
            } else if (timeFilter === '60d') {
                sinceDate.setDate(sinceDate.getDate() - 60);
            } else if (timeFilter === 'custom' && customStartDate) {
                sinceDate = new Date(customStartDate + "T00:00:00.000");
            }

            const deviceQuery = selectedDeviceTypes.length > 0 ? `&deviceTypes=${selectedDeviceTypes.join(',')}` : '';
            const siteQuery = selectedSites.length > 0 ? `&sites=${selectedSites.join(',')}` : '';
            const vendorQuery = selectedVendors.length > 0 ? `&vendors=${selectedVendors.join(',')}` : '';
            const severityQuery = selectedSeverity.length > 0 ? `&severity=${selectedSeverity.join(',')}` : '';
            
            let query = `/LiveAlerts?since=${sinceDate.toISOString()}&limit=1000${deviceQuery}${siteQuery}${vendorQuery}${severityQuery}`;
            if (sortConfig.key === 'reading_timestamp') {
                query += `&sortDirection=${sortConfig.direction}`;
                if (sortConfig.direction === 'asc') {
                    query += `&after_timestamp=${beforeTimestamp}`;
                } else {
                    query += `&before_timestamp=${beforeTimestamp}`;
                }
            } else {
                query += `&before_timestamp=${beforeTimestamp}`;
            }

            const response = await fetchApi(query);

            if (response.success && response.data) {
                setData(prev => [...prev, ...response.data]);
                setHasMoreData(response.data.length === 1000);
            }
        } catch (err) {
            console.error("Failed to load more alerts:", err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // WebSocket Integration for Real-Time Updates
    useEffect(() => {
        // Only establish WS if we're looking at recent data (e.g. 24h filter)
        if (timeFilter !== '24h') return;
        const socket = io(import.meta.env.VITE_SOCKET_URL, {
            path: '/iotdashboardbackend/api/v1/socket.io'
        });

        socket.on('connect', () => {
            console.log('[WebSocket] Connected for real-time live alerts');
        });

        socket.on('new_alerts', (newAlerts) => {
            if (!newAlerts || newAlerts.length === 0) return;

            setData(prevData => {
                // Ensure we don't duplicate alerts by checking data_id
                const existingDataIds = new Set(prevData.map(item => item.data_id));
                const uniqueNewAlerts = newAlerts.filter(item => !existingDataIds.has(item.data_id));

                if (uniqueNewAlerts.length > 0) {
                    return [...uniqueNewAlerts, ...prevData];
                }
                return prevData;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [timeFilter]);


    // Multi-select handlers are managed by the new SearchableMultiSelect component

    // Handle Row Search Click
    const handleRowSearch = (vehicleNo) => {
        if (!vehicleNo || vehicleNo === 'Unknown') return;
        const invalidRsNos = ['', 'NULL', 'NIL', 'NA', 'UNDEFINED'];
        if (invalidRsNos.includes(String(vehicleNo).toUpperCase())) {
            setShowNilRsNoModal(true);
            return;
        }
        navigate(`/alerts/vehicle/${vehicleNo}`, { state: { origin: '/alerts/live' } });
    };

    // Filtered & Sorted data for the table
    const processedData = useMemo(() => {
        let result = [...data];

        if (hideNilRsNo) {
            const invalidRsNos = ['NIL', 'NULL', '', 'NA', 'UNDEFINED'];
            result = result.filter(item => {
                return item.vehicleNo && !invalidRsNos.includes(String(item.vehicleNo).toUpperCase().trim());
            });
        }

        if (selectedDeviceTypes.length > 0) {
            result = result.filter(item => selectedDeviceTypes.includes(item.device_type_name));
        }

        if (sortConfig.key) {
            result = [...result].sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';

                // Custom sorting for severity
                if (sortConfig.key === 'highest_severity') {
                    const getWeight = (sev) => {
                        const s = (sev || '').toUpperCase();
                        if (s === 'CRITICAL' || s === 'HIGH_TEMP') return 4;
                        if (s === 'WARNING') return 3;
                        if (s === 'MAINTENANCE') return 2;
                        return 1; // UNKNOWN or others
                    };
                    aValue = getWeight(aValue);
                    bValue = getWeight(bValue);

                    // For severity, 'asc' means critical first (highest weight to lowest)
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    return 0;
                }

                if (sortConfig.key === 'positions') {
                    aValue = Array.isArray(aValue) ? aValue.join(', ') : String(aValue || '');
                    bValue = Array.isArray(bValue) ? bValue.join(', ') : String(bValue || '');
                }

                if (sortConfig.key === 'reading_timestamp') {
                    const timeA = new Date(aValue).getTime();
                    const timeB = new Date(bValue).getTime();
                    if (timeA < timeB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (timeA > timeB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                // Default string sorting
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, selectedDeviceTypes, sortConfig, hideNilRsNo]);

    // Pagination slice
    const paginatedData = useMemo(() => {
        if (rowsPerPage === 'All') return processedData;
        const start = (currentPage - 1) * rowsPerPage;
        return processedData.slice(start, start + rowsPerPage);
    }, [processedData, currentPage, rowsPerPage]);

    const totalPages = rowsPerPage === 'All' ? 1 : Math.ceil(processedData.length / rowsPerPage);

    // Helper for rendering severity badges
    const getSeverityBadge = (severity) => {
        const baseClasses = "flex items-center w-fit gap-1.5 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all duration-300";
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
            case 'HIGH_TEMP':
                return <span className={`${baseClasses} animate-pulse bg-red-500/10 text-red-600 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]   `}><AlertTriangle size={14} className="drop-shadow-md" /> {severity}</span>;
            case 'WARNING':
                return <span className={`${baseClasses} bg-amber-500/10 text-amber-600 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]   `}><AlertCircle size={14} /> {severity}</span>;
            case 'MAINTENANCE':
                return <span className={`${baseClasses} bg-yellow-500/10 text-yellow-700 border border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.15)]   `}><Info size={14} /> {severity}</span>;
            default:
                return <span className={`${baseClasses} bg-slate-500/10 text-slate-600 border border-slate-500/20 shadow-sm   `}><Info size={14} /> {severity || 'UNKNOWN'}</span>;
        }
    };

    // Handle Sorting Click
    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ?
            <ChevronUp size={14} className="text-indigo-600" /> :
            <ChevronDown size={14} className="text-indigo-600" />;
    };

    const tableContainerRef = useRef(null);
    const rowVirtualizer = useVirtualizer({
        count: paginatedData.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 64,
        overscan: 10,
    });

    const thClasses = "px-6 py-5 font-extrabold text-slate-500  text-[11px] uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-indigo-50/80  transition-colors select-none group border-b border-black ";

    return (
        <div className={`flex flex-col gap-6 w-full h-full pb-6`}>
            <style>{eChartsTooltipStylesHTML}</style>
            {/* Header section with filters */}
            <div className="relative z-50 bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xl shadow-red-100/20 group transition-all duration-500 overflow-visible">
                {/* Decorative background gradient */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-150"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                            <div className="p-2.5 bg-red-100 rounded-xl shadow-inner">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            Live Alerts Dashboard ( RollingStock Wise )
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium">Real-time monitoring of vehicle alerts across all zones.</p>

                        {/* Jump To Time Search */}
                        <div className="mt-3 inline-flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-slate-200/50 shadow-sm backdrop-blur-md relative overflow-hidden">
                            <div className="pl-3">
                                <Search size={16} className="text-indigo-500" />
                            </div>
                            <div className="relative flex items-center group/date cursor-pointer">
                                <div className="text-slate-700 pr-2 pl-1 py-1.5 text-sm font-semibold pointer-events-none">
                                    {jumpToTime ? jumpToTime.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                                </div>
                                <Calendar size={14} className="text-slate-400 pointer-events-none mr-3 group-hover/date:text-indigo-500 transition-colors" />
                                <input
                                    type="date"
                                    title="Jump to specific date in history"
                                    value={jumpToTime}
                                    onChange={(e) => setJumpToTime(e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                            </div>
                            {jumpToTime && (
                                <button onClick={() => setJumpToTime('')} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 relative z-10">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4">
                        {jumpToTime ? (
                            <button
                                onClick={() => setJumpToTime('')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 transition-all duration-300 shadow-sm"
                            >
                                <X size={16} />
                                Reset Date Search
                            </button>
                        ) : (
                            <>
                                {/* Time Filter */}
                                <div className="flex items-center gap-3 bg-white/50 p-1.5 rounded-2xl border border-slate-200/50 shadow-sm backdrop-blur-md">
                                    <div className="pl-3">
                                        <Calendar size={18} className="text-indigo-500" />
                                    </div>
                                    <select
                                        value={timeFilter}
                                        onChange={(e) => setTimeFilter(e.target.value)}
                                        className="bg-transparent text-slate-700 rounded-xl pr-10 pl-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer appearance-none outline-none border-none"
                                    >
                                        <option value="24h">Last 24 Hours</option>
                                        <option value="30d">Last 30 Days</option>
                                        <option value="60d">Last 60 Days</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>

                                {/* Custom Date Picker */}
                                {timeFilter === 'custom' && (
                                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl px-2 py-1 shadow-sm transition-all hover:bg-white">
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
                            </>
                        )}
                    </div>
                </div>

                {/* Filters Row */}
                {(availableDeviceTypes.length > 0 || availableSites.length > 0 || availableVendors.length > 0 || availableSeverities.length > 0) && (
                    <div className="relative z-40 mt-4 pt-4 border-t border-slate-200/60">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <Filter size={16} className="text-slate-500" />
                            </div>
                            <span className="text-sm font-bold text-slate-700 tracking-wide uppercase">Filters</span>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center w-full">

                            {/* Device Type Multi-Select Dropdown */}
                            {availableDeviceTypes.length > 0 && (
                                <SearchableMultiSelect
                                    label="All Device Types"
                                    options={availableDeviceTypes}
                                    selectedOptions={selectedDeviceTypes}
                                    onChange={(val) => { setSelectedDeviceTypes(val); setCurrentPage(1); }}
                                    placeholder="Search device types..."
                                />
                            )}

                            {/* Site Multi-Select Dropdown */}
                            {availableSites.length > 0 && (
                                <SearchableMultiSelect
                                    label="All Sites"
                                    options={availableSites}
                                    selectedOptions={selectedSites}
                                    onChange={(val) => { setSelectedSites(val); setCurrentPage(1); }}
                                    placeholder="Search sites..."
                                />
                            )}

                            {/* Vendor Multi-Select Dropdown */}
                            {availableVendors.length > 0 && (
                                <SearchableMultiSelect
                                    label="All Vendors"
                                    options={availableVendors}
                                    selectedOptions={selectedVendors}
                                    onChange={(val) => { setSelectedVendors(val); setCurrentPage(1); }}
                                    placeholder="Search vendors..."
                                />
                            )}

                            {/* Severity Multi-Select Dropdown */}
                            {availableSeverities.length > 0 && (
                                <SearchableMultiSelect
                                    label="All Severities"
                                    options={availableSeverities}
                                    selectedOptions={selectedSeverity}
                                    onChange={(val) => { setSelectedSeverity(val); setCurrentPage(1); }}
                                    placeholder="Search severities..."
                                    minWidth="180px"
                                />
                            )}

                            <div className="ml-auto flex items-center gap-4">
                                <label className="flex items-center gap-2.5 cursor-pointer text-slate-600 font-bold text-sm bg-white/50 px-4 py-2 rounded-xl border border-slate-200/60 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 hover:border-indigo-300">
                                    <input
                                        type="checkbox"
                                        checked={hideNilRsNo}
                                        onChange={(e) => {
                                            setHideNilRsNo(e.target.checked);
                                            setCurrentPage(1);
                                        }}
                                        className="w-4.5 h-4.5 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                                    />
                                    Hide NIL RS No.
                                </label>
                                {(selectedDeviceTypes.length > 0 || selectedSites.length > 0 || selectedVendors.length > 0 || selectedSeverity.length > 0) && (
                                    <button
                                        onClick={() => {
                                            setSelectedDeviceTypes([]);
                                            setSelectedSites([]);
                                            setSelectedVendors([]);
                                            setSelectedSeverity([]);
                                        }}
                                        className="px-4 py-2 rounded-full text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 transition-all duration-300 hover:-translate-y-0.5"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden flex-1 flex flex-col min-h-0">
                <div ref={tableContainerRef} className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-sm">
                            <tr className="bg-slate-50/80 divide-x divide-black">
                                <th onClick={() => handleSort('reading_timestamp')} className={`${thClasses} w-1 !px-2 text-center`}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-center">Timestamp</span> {getSortIcon('reading_timestamp')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('vendor_name')} className={`${thClasses} w-1 !px-2 text-center`}>
                                    <div className="flex items-center justify-center gap-1">Vendor {getSortIcon('vendor_name')}</div>
                                </th>
                                <th onClick={() => handleSort('site')} className={thClasses}>
                                    <div className="flex items-center gap-2">Site {getSortIcon('site')}</div>
                                </th>
                                <th onClick={() => handleSort('device_id')} className={`${thClasses} w-1 !px-1 !whitespace-normal leading-tight text-center`}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-center">ID</span> {getSortIcon('device_id')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('device_type_name')} className={`${thClasses} w-1 !px-1 !whitespace-normal leading-tight text-center`}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-center">Type</span> {getSortIcon('device_type_name')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('vehicleNo')} className={thClasses}>
                                    <div className="flex items-center gap-2">RS No. {getSortIcon('vehicleNo')}</div>
                                </th>
                                <th onClick={() => handleSort('category')} className={`${thClasses} w-1 !px-1 !whitespace-normal text-center`}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-center">Cat.</span> {getSortIcon('category')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('positions')} className={`${thClasses} w-1 !px-2 text-center`}>
                                    <div className="flex items-center justify-center gap-1">Position {getSortIcon('positions')}</div>
                                </th>
                                <th onClick={() => handleSort('device_data')} className={thClasses}>
                                    <div className="flex items-center gap-2">Device Data {getSortIcon('device_data')}</div>
                                </th>
                                <th onClick={() => handleSort('highest_severity')} className={`${thClasses} w-1 !px-2 text-center`}>
                                    <div className="flex items-center justify-center gap-1">Severity {getSortIcon('highest_severity')}</div>
                                </th>
                                <th className={`${thClasses} text-center w-1 !px-1`}>
                                    Data
                                </th>
                                <th onClick={() => handleSort('zone')} className={`${thClasses} w-1 !px-2 text-center`}>
                                    <div className="flex items-center justify-center gap-1">Zone {getSortIcon('zone')}</div>
                                </th>
                                <th onClick={() => handleSort('division')} className={`${thClasses} w-1 !px-2 text-center`}>
                                    <div className="flex items-center justify-center gap-1">Division {getSortIcon('division')}</div>
                                </th>
                                <th onClick={() => handleSort('next_txr_point')} className={thClasses}>
                                    <div className="flex items-center gap-2">Next TXR Point {getSortIcon('next_txr_point')}</div>
                                </th>
                                <th onClick={() => handleSort('data_id')} className={thClasses}>
                                    <div className="flex items-center gap-2">Data ID {getSortIcon('data_id')}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            {loading ? (
                                <tr>
                                    <td colSpan="13" className="px-6 py-20 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-4 animate-fade-in-up">
                                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-500/20"></div>
                                            <span className="font-bold tracking-widest uppercase text-sm animate-pulse-glow text-indigo-600">Fetching Telemetry...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="14" className="px-6 py-20 text-center text-red-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-4 bg-red-50 rounded-full">
                                                <AlertTriangle size={40} className="text-red-500" />
                                            </div>
                                            <span className="font-bold text-lg">{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : processedData.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="px-6 py-20 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <Info size={40} className="text-slate-400" />
                                            </div>
                                            <span className="font-medium text-lg">No active alerts found for the selected criteria.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {rowVirtualizer.getVirtualItems().length > 0 && (
                                        <tr><td style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} colSpan="14" /></tr>
                                    )}
                                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const alert = paginatedData[virtualRow.index];
                                        return (
                                            <tr
                                                key={virtualRow.key}
                                                ref={rowVirtualizer.measureElement}
                                                data-index={virtualRow.index}
                                                onClick={() => handleRowSearch(alert.vehicleNo)}
                                                className="group/row cursor-pointer hover:bg-white hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 relative border-b border-black last:border-none z-0 hover:z-10 divide-x divide-black"
                                            >
                                                <td className="px-2 py-2.5 font-medium text-slate-600 w-1 text-center whitespace-normal leading-tight">
                                                    {alert.reading_timestamp ? new Date(alert.reading_timestamp).toLocaleString('en-GB') : 'N/A'}
                                                </td>
                                                <td className="px-2 py-2.5 font-medium text-slate-600 w-1 text-center text-xs whitespace-normal leading-tight">
                                                    {alert.vendor_name || 'N/A'}
                                                </td>
                                                <td className="px-6 py-2.5 font-medium text-slate-600">
                                                    {alert.site || 'N/A'}
                                                </td>
                                                <td className="px-1 py-2.5 font-medium text-slate-600 w-1 text-center text-xs">
                                                    {alert.device_id || 'Unknown'}
                                                </td>
                                                <td className="px-1 py-2.5 font-medium text-slate-600 w-1 text-center text-xs">
                                                    {alert.device_type_name || 'N/A'}
                                                </td>
                                                <td className="px-6 py-2.5">
                                                    <span className="font-extrabold text-slate-900 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60 group-hover/row:border-indigo-300 transition-colors">{alert.vehicleNo || 'Unknown'}</span>
                                                </td>
                                                <td className="px-1 py-2.5 font-medium text-slate-600 w-1 text-center text-xs">
                                                    {alert.category || 'N/A'}
                                                </td>
                                                <td className="px-2 py-2.5 w-1 text-center">
                                                    <span className="font-bold text-slate-600 flex items-center justify-center gap-1">
                                                        {Array.isArray(alert.positions) && alert.positions.length > 0 ? (
                                                            <div className="flex flex-wrap justify-center gap-1">
                                                                {alert.positions.filter(Boolean).map((pos, pidx) => (
                                                                    <span key={pidx} className={`px-2 py-1 rounded text-xs ${pos === 'Data wrong' ? 'bg-red-50 text-red-600 border border-red-200    shadow-sm' : 'bg-slate-100 '}`}>
                                                                        {pos}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                                                    {Array.isArray(alert.device_data) && alert.device_data.length > 0 ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            {(() => {
                                                                const isExpanded = expandedDeviceRows.has(alert.data_id);
                                                                const showExpandButton = alert.device_data.length > 1;
                                                                const visibleData = isExpanded ? alert.device_data : alert.device_data.slice(0, 1);

                                                                return (
                                                                    <>
                                                                        {visibleData.map((data, didx) => {
                                                                            if (!data) return null;
                                                                            const posLabel = alert.positions?.[didx] || '';
                                                                            return (
                                                                                <div key={didx} className="flex flex-col gap-1.5 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                                                                                    {posLabel && (
                                                                                        <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm ${posLabel === 'Data wrong' ? 'bg-red-100 text-red-700  ' : 'bg-slate-200 text-slate-700  '}`}>
                                                                                            {posLabel}
                                                                                        </span>
                                                                                    )}
                                                                                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                                                                                        {typeof data === 'object' ? Object.entries(data).map(([k, v], i) => (
                                                                                            <div key={i} className="flex items-center text-[10px] bg-indigo-50/80 border border-indigo-100/50 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">
                                                                                                <span className="font-bold text-indigo-700/80 mr-1">{k}:</span>
                                                                                                <span className="font-medium text-slate-700">{String(v)}</span>
                                                                                            </div>
                                                                                        )) : (
                                                                                            <span className="bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate max-w-[200px]" title={String(data)}>
                                                                                                {String(data)}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {showExpandButton && (
                                                                            <button
                                                                                onClick={(e) => toggleDeviceRow(e, alert.data_id)}
                                                                                className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 w-fit self-start bg-indigo-50 px-2.5 py-1 rounded transition-colors flex items-center justify-center gap-1 shadow-sm border border-indigo-100"
                                                                            >
                                                                                {isExpanded ? (
                                                                                    <>Collapse</>
                                                                                ) : (
                                                                                    <>+ {alert.device_data.length - 1} more</>
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-2 py-2.5 w-1 text-center">
                                                    {getSeverityBadge(alert.highest_severity)}
                                                </td>
                                                <td className="px-2 py-2.5 text-center w-1">
                                                    <button
                                                        onClick={(e) => handleViewData(e, alert.data_id)}
                                                        className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                                        title="View Raw Data"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                                <td className="px-2 py-2.5 text-slate-600 font-bold w-1 text-center">
                                                    {alert.zone || '-'}
                                                </td>
                                                <td className="px-2 py-2.5 text-slate-600 font-medium w-1 text-center">
                                                    {alert.division || '-'}
                                                </td>
                                                <td className="px-6 py-2.5 text-slate-600 font-medium">
                                                    {alert.next_txr_point || '-'}
                                                </td>
                                                <td className="px-6 py-2.5 font-medium text-indigo-600">
                                                    #{alert.data_id}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {rowVirtualizer.getVirtualItems().length > 0 && (
                                        <tr><td style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }} colSpan="10" /></tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && !error && processedData.length > 0 && (
                    <PaginationFooter
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        totalItems={processedData.length}
                        totalPages={getTotalPages(processedData.length)}
                        hasMoreData={hasMoreData}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={loadMoreData}
                    />
                )}
            </div>

            {/* NIL RS Number Modal */}
            {showNilRsNoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Info className="text-indigo-500" size={20} />
                                Information
                            </h3>
                            <button
                                onClick={() => setShowNilRsNoModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm font-medium leading-relaxed border border-indigo-100">
                                This alert does not have an associated Rolling Stock (RS) number (marked as NIL). Cannot navigate to vehicle details.
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setShowNilRsNoModal(false)}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                OK, Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
