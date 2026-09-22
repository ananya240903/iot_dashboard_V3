import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, RefreshCw, Eye } from 'lucide-react';
import { fetchApi } from '../../utils/api';
import PaginationFooter from '../../components/common/PaginationFooter';
import { useChunkedPagination } from '../../hooks/useChunkedPagination';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useVendorStore } from '../../store/useVendorStore';

export default function ZoneAlertDetails() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const alertsFilter = searchParams.get('filter') || 'all';
    const alertsSeverity = searchParams.get('severity');
    const initialZone = searchParams.get('zone') || 'All';

    const [initialLoading, setInitialLoading] = useState(false);
    const [apiData, setApiData] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'reading_timestamp', direction: 'desc' });

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
    } = useChunkedPagination(15);

    // Table Filters
    const [filterHasAlert, setFilterHasAlert] = useState(searchParams.get('hasAlert') || 'true');
    const [filterTime, setFilterTime] = useState(searchParams.get('time') || '30d');
    const [filterZone, setFilterZone] = useState(initialZone);
    const [filterConnection, setFilterConnection] = useState('All');
    const [filterVendor, setFilterVendor] = useState('All');
    const [searchQuery, setSearchQuery] = useState("");
    
    const { deviceLocations, fetchDeviceLocations } = useDeviceStore();
    const { vendors: globalVendors, fetchVendors } = useVendorStore();

    useEffect(() => {
        fetchDeviceLocations();
        fetchVendors();
    }, [fetchDeviceLocations, fetchVendors]);

    // Get unique values for dropdowns
    const uniqueZones = useMemo(() => {
        if (deviceLocations && deviceLocations.length > 0) {
            const zones = [...new Set(deviceLocations.map(d => d.zone).filter(Boolean))];
            zones.sort();
            return ['All', ...zones];
        }
        return ['All', ...new Set(apiData.map(d => d.zone).filter(Boolean))];
    }, [apiData, deviceLocations]);

    const uniqueVendors = useMemo(() => {
        return ['All', ...globalVendors];
    }, [globalVendors]);

    const uniqueConnections = useMemo(() => {
        return ['All', 'Live', 'Offline'];
    }, []);

    useEffect(() => {
        if (!alertsFilter) return;

        const fetchData = async () => {
            setInitialLoading(true);
            resetPagination();
            try {
                let query = `?deviceType=${alertsFilter}&limit=1000`;
                if (filterHasAlert !== 'All') query += `&hasAlert=${filterHasAlert}`;
                if (filterTime !== 'All') query += `&time=${filterTime}`;
                if (filterZone && filterZone !== 'All') query += `&zone=${filterZone}`;
                if (filterVendor && filterVendor !== 'All') query += `&vendor=${filterVendor}`;
                if (alertsSeverity) query += `&severity=${alertsSeverity}`;
                if (sortConfig.key === 'reading_timestamp') query += `&sortDirection=${sortConfig.direction}`;

                const response = await fetchApi(`/Deviceinformation/filtered-sensor-data${query}`);
                if (response.success && response.data) {
                    setApiData(response.data);
                    setHasMoreData(response.data.length === 1000);
                } else {
                    setApiData([]);
                }
            } catch (err) {
                console.error("Failed to fetch alerts:", err);
            } finally {
                setInitialLoading(false);
            }
        };

        fetchData();

    }, [alertsFilter, alertsSeverity, filterZone, filterVendor, filterHasAlert, filterTime, sortConfig]);

    const loadMoreData = async () => {
        if (!hasMoreData || isLoadingMore || apiData.length === 0) return;
        setIsLoadingMore(true);
        
        try {
            const lastAlert = apiData[apiData.length - 1];
            const beforeTimestamp = lastAlert.reading_timestamp;
            
            let query = `?deviceType=${alertsFilter}&limit=1000`;
            const isAscending = sortConfig.key === 'reading_timestamp' && sortConfig.direction === 'asc';
            if (isAscending) {
                query += `&after_timestamp=${beforeTimestamp}&sortDirection=asc`;
            } else {
                query += `&before_timestamp=${beforeTimestamp}`;
                if (sortConfig.key === 'reading_timestamp') {
                    query += `&sortDirection=desc`;
                }
            }
            
            if (filterHasAlert !== 'All') query += `&hasAlert=${filterHasAlert}`;
            if (filterTime !== 'All') query += `&time=${filterTime}`;
            if (filterZone && filterZone !== 'All') query += `&zone=${filterZone}`;
            if (filterVendor && filterVendor !== 'All') query += `&vendor=${filterVendor}`;
            if (alertsSeverity) query += `&severity=${alertsSeverity}`;

            const response = await fetchApi(`/Deviceinformation/filtered-sensor-data${query}`);
            if (response.success && response.data) {
                setApiData(prev => [...prev, ...response.data]);
                setHasMoreData(response.data.length === 1000);
            }
        } catch (err) {
            console.error("Failed to load more alerts:", err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const filteredData = useMemo(() => {
        let details = apiData;

        // Apply dropdown filters
        if (filterZone !== 'All') {
            details = details.filter(d => d.zone === filterZone);
        }
        if (filterVendor !== 'All') {
            details = details.filter(d => d.vendor_name === filterVendor);
        }
        if (filterConnection !== 'All') {
            details = details.filter(d => d.connection_status && d.connection_status.toLowerCase() === filterConnection.toLowerCase());
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            details = details.filter(d =>
                (d.device_id && String(d.device_id).toLowerCase().includes(lowerQuery)) ||
                (d.device_type_name && String(d.device_type_name).toLowerCase().includes(lowerQuery)) ||
                (d.zone && String(d.zone).toLowerCase().includes(lowerQuery))
            );
        }
        return details;
    }, [apiData, searchQuery, filterZone, filterVendor, filterConnection]);

    const sortedDetails = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = (bValue || '').toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    useEffect(() => {
        setCurrentPage(1);
    }, [alertsFilter, alertsSeverity, searchQuery, sortConfig, filterZone, filterVendor, filterConnection]);

    const paginatedDetails = rowsPerPage === 'All' 
        ? sortedDetails 
        : sortedDetails.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
        if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="ml-1 text-indigo-500" />;
        return <ArrowDown size={14} className="ml-1 text-indigo-500" />;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-GB');
    };

    return (
        <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl shadow-sm border border-slate-200/60 mb-8 transition-all duration-500 flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => {
                            if (window.history.state && window.history.state.idx > 0) {
                                navigate(-1);
                            } else {
                                navigate('/zone-analysis');
                            }
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 capitalize tracking-tight transition-colors">
                            <span>{alertsFilter === 'all' ? 'All Alert Details' : `${alertsSeverity ? (alertsSeverity === 'OTHER' ? 'Other Severity' : alertsSeverity.toLowerCase()) : ''} Alerts for ${alertsFilter}`.trim()}</span>
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1 transition-colors">
                            Showing {filteredData.length}{hasMoreData ? '+' : ''} alert(s)
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3 transition-colors">
                <div className="relative flex-1 min-w-[250px] max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-slate-400" size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by device ID, name or zone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder-slate-400 shadow-sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={filterHasAlert}
                        onChange={(e) => setFilterHasAlert(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none shadow-sm transition-colors"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                    >
                        <option value="All">All</option>
                        <option value="true">Has Alert: Yes</option>
                        <option value="false">Has Alert: No</option>
                    </select>
                    <select
                        value={filterTime}
                        onChange={(e) => setFilterTime(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none shadow-sm transition-colors"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                    >
                        <option value="All">All Time</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="60d">Last 60 Days</option>
                    </select>
                    <select
                        value={filterZone}
                        onChange={(e) => setFilterZone(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none shadow-sm transition-colors"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                    >
                        <option value="All">All Zones</option>
                        {uniqueZones.filter(z => z !== 'All').map(z => (
                            <option key={z} value={z}>{z}</option>
                        ))}
                    </select>
                    <select
                        value={filterVendor}
                        onChange={(e) => setFilterVendor(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none shadow-sm transition-colors"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                    >
                        <option value="All">All Vendors</option>
                        {uniqueVendors.filter(v => v !== 'All').map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                    <select
                        value={filterConnection}
                        onChange={(e) => setFilterConnection(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none shadow-sm transition-colors"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                    >
                        <option value="All">All Connections</option>
                        {uniqueConnections.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c} className="capitalize">{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm relative min-h-[300px]">
                {initialLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-20">
                        <RefreshCw className="animate-spin text-indigo-500 mb-4" size={32} strokeWidth={2.5} />
                        <span className="text-slate-500 font-medium">Loading alerts data...</span>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-16">S.No</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Data ID
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Zone
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Device Name
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Device ID
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Vendor
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Connection
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => requestSort('reading_timestamp')}>
                                    <div className="flex items-center">Reading Time {renderSortIcon('reading_timestamp')}</div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Severity
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedDetails.map((detail, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate(`/zone-analysis/data/${detail.data_id}`)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-400">
                                        {(rowsPerPage === 'All' ? 0 : (currentPage - 1) * rowsPerPage) + idx + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                                        {detail.data_id || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">
                                        {detail.zone || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                                        {detail.device_type_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                                        {detail.device_id || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                                        {detail.vendor_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${detail.connection_status === 'live' ? 'bg-emerald-50 text-emerald-600 border-emerald-200   ' : 'bg-rose-50 text-rose-600 border-rose-200   '
                                            }`}>
                                            {detail.connection_status || 'offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                                        {formatDate(detail.reading_timestamp)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg shadow-sm ${['critical', 'high'].includes((detail.highest_severity || '').toLowerCase()) ? 'bg-rose-100 text-rose-700 border border-rose-200   ' :
                                                ['warning', 'medium', 'maintenance'].includes((detail.highest_severity || '').toLowerCase()) ? 'bg-amber-100 text-amber-700 border border-amber-200   ' :
                                                    ['low', 'info'].includes((detail.highest_severity || '').toLowerCase()) ? 'bg-blue-100 text-blue-700 border border-blue-200   ' :
                                                        ['normal', 'ok', 'good'].includes((detail.highest_severity || '').toLowerCase()) ? 'bg-emerald-100 text-emerald-700 border border-emerald-200   ' :
                                                            'bg-slate-100 text-slate-700 border border-slate-200   '
                                            }`}>
                                            {detail.highest_severity || 'Unknown'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {sortedDetails.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="px-8 py-16 text-center text-slate-400 font-medium">
                                        No alerts found in this category.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Controls */}
            {!initialLoading && sortedDetails.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                    <PaginationFooter
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        totalItems={sortedDetails.length}
                        totalPages={getTotalPages(sortedDetails.length)}
                        hasMoreData={hasMoreData}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={loadMoreData}
                    />
                </div>
            )}
        </div>
    );
}
