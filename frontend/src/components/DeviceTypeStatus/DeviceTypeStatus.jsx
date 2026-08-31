import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Activity, PieChart as PieChartIcon, Eye, EyeOff } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchApi } from '../../utils/api';

import { useDeviceStore } from '../../store/useDeviceStore';
import { useNavigate } from 'react-router-dom';

export default function DeviceTypeStatus() {
    const { deviceData: data, loading: isLoading, error, fetchDeviceData } = useDeviceStore();
    const navigate = useNavigate();
    const [revealedCards, setRevealedCards] = useState({});

    useEffect(() => {
        fetchDeviceData();
    }, [fetchDeviceData]);

    const typeStats = useMemo(() => {
        if (!data || data.length === 0) return [];

        const statsMap = {};

        data.forEach(zoneEntry => {
            if (zoneEntry.device_types && Array.isArray(zoneEntry.device_types)) {
                zoneEntry.device_types.forEach(dt => {
                    const typeName = dt.device_type_name;

                    if (!statsMap[typeName]) {
                        statsMap[typeName] = { live: 0, offline: 0, alerts: 0, maintenance: 0, critical: 0, others: 0 };
                    }

                    if (dt.devices && Array.isArray(dt.devices)) {
                        dt.devices.forEach(device => {
                            const status = device.status ? device.status.toLowerCase() : 'offline';
                            if (status === 'live' || status === 'online') {
                                statsMap[typeName].live++;
                            } else {
                                statsMap[typeName].offline++;
                            }

                            if (typeof device.trueAlertCount === 'number') {
                                statsMap[typeName].alerts += device.trueAlertCount;
                            }
                            if (typeof device.maintenanceCount === 'number') {
                                statsMap[typeName].maintenance += device.maintenanceCount;
                            }
                            if (typeof device.criticalCount === 'number') {
                                statsMap[typeName].critical += device.criticalCount;
                            }
                            if (typeof device.otherCount === 'number') {
                                statsMap[typeName].others += device.otherCount;
                            }
                        });
                    }
                });
            }
        });

        // Convert map to array and filter out types with no devices
        return Object.keys(statsMap).map(typeName => ({
            name: typeName,
            live: statsMap[typeName].live,
            offline: statsMap[typeName].offline,
            total: statsMap[typeName].live + statsMap[typeName].offline,
            alerts: statsMap[typeName].alerts,
            maintenance: statsMap[typeName].maintenance,
            critical: statsMap[typeName].critical,
            others: statsMap[typeName].others
        })).filter(stat => stat.total > 0);

    }, [data]);

    const COLORS = {
        live: '#10b981',    // Emerald 500
        offline: '#f43f5e'  // Rose 500
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-[500px] bg-white/90 backdrop-blur-2xl rounded-3xl shadow-sm border border-slate-200/60 mb-8 transition-all duration-500">
                <RefreshCw className="animate-spin text-indigo-500 mb-4" size={36} strokeWidth={2.5} />
                <span className="text-slate-500 font-bold tracking-wide">Loading device status...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center">
                <p className="font-semibold text-lg">{error}</p>
                <p className="text-sm mt-2 opacity-80">Please ensure the backend server is running.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-3xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 flex items-center gap-3">
                            <div className="p-3 bg-indigo-100 rounded-2xl">
                                <Activity className="text-indigo-600" size={28} strokeWidth={2.5} />
                            </div>
                            Device Type Status
                        </h1>

                    </div>
                </div>
            </div>

            {/* Grid of Pie Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {typeStats.map((stat, idx) => {
                    const chartData = [
                        { name: 'Live', value: stat.live, color: COLORS.live },
                        { name: 'Offline', value: stat.offline, color: COLORS.offline }
                    ];

                    const livePercentage = Math.round((stat.live / stat.total) * 100) || 0;

                    return (
                        <div key={idx} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-white hover:-translate-y-1 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <PieChartIcon className="text-indigo-500" size={20} />
                                    {stat.name}
                                </h3>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${livePercentage >= 80 ? 'bg-emerald-100 text-emerald-700  ' : 'bg-rose-100 text-rose-700  '}`}>
                                    {livePercentage}% Live
                                </span>
                            </div>
                            <p className="text-sm font-medium text-slate-400 mb-6">
                                {stat.total} Total Devices
                            </p>

                            <div className="h-64 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-sm hover:opacity-80 transition-opacity" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                                fontWeight: 'bold',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)'
                                            }}
                                            itemStyle={{ color: '#1e293b' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Center text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold text-slate-700">{stat.live}</span>
                                    <span className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase">Live</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span className="text-sm font-semibold text-slate-600">Live: {stat.live}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                    <span className="text-sm font-semibold text-slate-600">Offline: {stat.offline}</span>
                                </div>
                            </div>

                            <div className="mt-6 border border-slate-200/60 rounded-xl overflow-hidden transition-all duration-300 bg-white">
                                <div 
                                    className="p-3 flex items-center justify-between bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => setRevealedCards(prev => ({...prev, [stat.name]: !prev[stat.name]}))}
                                >
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alerts Breakdown</span>
                                    {revealedCards[stat.name] ? (
                                        <EyeOff size={18} className="text-indigo-500" />
                                    ) : (
                                        <Eye size={18} className="text-indigo-500 hover:scale-110 transition-transform" />
                                    )}
                                </div>
                                
                                {revealedCards[stat.name] && (
                                    <div className="p-4 bg-white border-t border-slate-200/60 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div 
                                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${stat.alerts > 0 ? 'bg-amber-50 cursor-pointer hover:bg-amber-100' : 'bg-slate-50'}`}
                                            onClick={() => {
                                                if (stat.alerts > 0) {
                                                    navigate(`/zone-analysis/alerts?filter=${stat.name}&hasAlert=true&time=All`);
                                                }
                                            }}
                                        >
                                            <span className="text-xs font-bold text-slate-600 uppercase">Total Alerts</span>
                                            <span className={`text-sm font-bold ${stat.alerts > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{stat.alerts}</span>
                                        </div>
                                        <div 
                                            className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${stat.maintenance > 0 ? 'bg-yellow-50/50 border-yellow-100/50 cursor-pointer hover:bg-yellow-100' : 'bg-slate-50 border-slate-100'}`}
                                            onClick={() => {
                                                if (stat.maintenance > 0) {
                                                    navigate(`/zone-analysis/alerts?filter=${encodeURIComponent(stat.name)}&severity=MAINTENANCE&hasAlert=true&time=All`);
                                                }
                                            }}
                                        >
                                            <span className={`text-xs font-bold uppercase ${stat.maintenance > 0 ? 'text-yellow-700' : 'text-slate-400'}`}>Maintenance</span>
                                            <span className={`text-sm font-bold ${stat.maintenance > 0 ? 'text-yellow-600' : 'text-slate-400'}`}>{stat.maintenance}</span>
                                        </div>
                                        <div 
                                            className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${stat.critical > 0 ? 'bg-rose-50/50 border-rose-100/50 cursor-pointer hover:bg-rose-100' : 'bg-slate-50 border-slate-100'}`}
                                            onClick={() => {
                                                if (stat.critical > 0) {
                                                    navigate(`/zone-analysis/alerts?filter=${encodeURIComponent(stat.name)}&severity=CRITICAL&hasAlert=true&time=All`);
                                                }
                                            }}
                                        >
                                            <span className={`text-xs font-bold uppercase ${stat.critical > 0 ? 'text-rose-700' : 'text-slate-400'}`}>Critical</span>
                                            <span className={`text-sm font-bold ${stat.critical > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{stat.critical}</span>
                                        </div>
                                        {stat.others > 0 && (
                                            <div 
                                                className={`flex items-center justify-between p-2 rounded-lg border transition-colors bg-blue-50/50 border-blue-100/50 cursor-pointer hover:bg-blue-100`}
                                                onClick={() => {
                                                    navigate(`/zone-analysis/alerts?filter=${encodeURIComponent(stat.name)}&severity=OTHER&hasAlert=true&time=All`);
                                                }}
                                                title="Other alerts that are not Maintenance or Critical. Click to view all alerts for this device type."
                                            >
                                                <span className="text-xs font-bold uppercase text-blue-700">Other Severities</span>
                                                <span className="text-sm font-bold text-blue-600">{stat.others}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
