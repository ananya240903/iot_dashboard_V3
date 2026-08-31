import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useVendorStore } from '../../store/useVendorStore';
import calculate from '../../components/DeviceData/calculate';

export default function ZoneCalibrationDetails() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const calibrationFilter = searchParams.get('filter') || 'all';
    const selectedZone = searchParams.get('zone') || 'All';

    const { deviceData: data, loading: isLoading, fetchDeviceData, deviceLocations, fetchDeviceLocations } = useDeviceStore();
    const { vendors: globalVendors, fetchVendors } = useVendorStore();

    useEffect(() => {
        if (!data || data.length === 0) {
            fetchDeviceData();
        }
        fetchDeviceLocations();
        fetchVendors();
    }, [data, fetchDeviceData, fetchDeviceLocations, fetchVendors]);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [filterZone, setFilterZone] = useState(selectedZone);
    const [filterVendor, setFilterVendor] = useState('All');
    const itemsPerPage = 15;

    const uniqueZones = useMemo(() => {
        if (deviceLocations && deviceLocations.length > 0) {
            const zones = [...new Set(deviceLocations.map(d => d.zone).filter(Boolean))];
            zones.sort();
            return ['All', ...zones];
        }
        return ['All', ...new Set((data || []).map(d => d.zone).filter(Boolean))];
    }, [data, deviceLocations]);

    const uniqueVendors = useMemo(() => {
        return ['All', ...globalVendors];
    }, [globalVendors]);

    const calibrationStats = useMemo(() => {
        return calculate(data, { zone: filterZone, deviceType: ["All"], status: "All" }).calibrationStats;
    }, [data, filterZone]);

    const filteredCalibrationDetails = useMemo(() => {
        if (!calibrationStats?.details) return [];
        let details = calibrationFilter === 'all' ? calibrationStats.details : calibrationStats.details.filter(d => d.category === calibrationFilter);
        if (filterVendor !== 'All') {
            details = details.filter(d => d.vendor_name === filterVendor);
        }
        if (searchQuery) {
            details = details.filter(d => String(d.device_id).toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return details;
    }, [calibrationFilter, calibrationStats, searchQuery, filterVendor]);


    const sortedDetails = useMemo(() => {
        let sortableItems = [...filteredCalibrationDetails];
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
    }, [filteredCalibrationDetails, sortConfig]);


    useEffect(() => {
        setCurrentPage(1);
    }, [calibrationFilter, searchQuery, sortConfig, filterZone, filterVendor]);

    const totalPages = Math.ceil(sortedDetails.length / itemsPerPage);
    const paginatedDetails = sortedDetails.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-[500px] bg-white/90 backdrop-blur-2xl rounded-3xl shadow-sm border border-slate-200/60 transition-all duration-500">
                <RefreshCw className="animate-spin text-indigo-500 mb-4" size={36} strokeWidth={2.5} />
                <span className="text-slate-500 font-bold tracking-wide">Loading device data...</span>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl shadow-sm border border-slate-200/60 mb-8 transition-all duration-500 flex flex-col h-full min-h-[70vh]">
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
                        <h2 className="text-2xl font-extrabold text-slate-800 capitalize tracking-tight">
                            {calibrationFilter === 'all' ? 'All Calibration Details' : `${calibrationFilter} Calibration Details`}
                            {filterZone !== 'All' && ` (${filterZone})`}
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">
                            Showing {filteredCalibrationDetails.length} device(s)
                        </p>
                    </div>
                </div>
                <div className="relative flex-1 min-w-[250px] max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-slate-400" size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by device ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder-slate-400 shadow-sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={filterZone}
                        onChange={(e) => setFilterZone(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none shadow-sm transition-colors"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                    >
                        {uniqueZones.map(zone => (
                            <option key={zone} value={zone}>{zone === 'All' ? 'All Zones' : zone}</option>
                        ))}
                    </select>

                    <select
                        value={filterVendor}
                        onChange={(e) => setFilterVendor(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none shadow-sm transition-colors"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                    >
                        {uniqueVendors.map(vendor => (
                            <option key={vendor} value={vendor}>{vendor === 'All' ? 'All Vendors' : vendor}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-16">S.No</th>
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
                                Site
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Vendor
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th 
                                className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors"
                                onClick={() => requestSort('calibrated_on')}
                            >
                                <div className="flex items-center">Calibrated On {renderSortIcon('calibrated_on')}</div>
                            </th>
                            <th 
                                className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors"
                                onClick={() => requestSort('next_calibration_due')}
                            >
                                <div className="flex items-center">Next Calibration {renderSortIcon('next_calibration_due')}</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedDetails.map((detail, idx) => (
                            <tr 
                                key={idx} 
                                className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                onClick={() => navigate(`/zone-analysis/device/${detail.device_id}`)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-400">
                                    {((currentPage - 1) * itemsPerPage) + idx + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">
                                    {detail.zone}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                                    {detail.device_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                                    {detail.device_id || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                                    {detail.site || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                                    {detail.vendor_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${detail.category === 'valid' ? 'bg-blue-50 text-blue-600 border-blue-200   ' :
                                            detail.category === 'overdue' ? 'bg-orange-50 text-orange-600 border-orange-200   ' :
                                                'bg-slate-50 text-slate-600 border-slate-200   '
                                        }`}>
                                        {detail.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                    {detail.calibrated_on !== 'N/A' ? new Date(detail.calibrated_on).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                    {detail.next_calibration_due !== 'N/A' ? new Date(detail.next_calibration_due).toLocaleDateString() : 'N/A'}
                                </td>
                            </tr>
                        ))}
                        {sortedDetails.length === 0 && (
                            <tr>
                                <td colSpan="9" className="px-8 py-16 text-center text-slate-400 font-medium">
                                    No devices found in this category.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Page <span className="font-bold text-slate-700">{currentPage}</span> of <span className="font-bold text-slate-700">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white text-slate-600 rounded-xl text-sm font-medium border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white text-slate-600 rounded-xl text-sm font-medium border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
