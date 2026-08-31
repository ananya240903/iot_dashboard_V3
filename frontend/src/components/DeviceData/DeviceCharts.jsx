import React from 'react';
import PieChart from '../PieChart/Piechart';
import BarGraph from '../BarGraph/BarGraph';

export default function DeviceCharts({
    chartData,
    alertStats,
    zoneStats,
    selectedZone,
    selectedDeviceType,
    deviceTypes,
    setAlertsFilter
}) {
    const validDeviceTypes = (deviceTypes || []).filter(type => type !== "All");

    // Thematic palettes: Cool/Active tones for Live, Warm/Inactive tones for Offline
    // Thematic paired palettes: Same base hues for each device type to maintain identity, 
    // but vibrant for Live and pale/muted for Offline.
    const liveColors = ['#4f46e5', '#059669', '#0284c7', '#7c3aed', '#e11d48', '#d97706', '#0d9488', '#c026d3'];
    const offlineColors = ['#a5b4fc', '#6ee7b7', '#7dd3fc', '#c4b5fd', '#fda4af', '#fcd34d', '#5eead4', '#f0abfc'];

    const dynamicBars = [];

    if (validDeviceTypes.length > 0) {
        // Interleave Live and Offline for each device type so they stack together in the single bar
        validDeviceTypes.forEach((type, index) => {
            const colorIndex = index % liveColors.length;

            // Live devices at the bottom of the device's section
            dynamicBars.push({
                dataKey: `live_${type}`,
                name: `${type} (Live)`,
                color: liveColors[colorIndex],
                activeColor: liveColors[colorIndex],
                stackId: 'zone'
            });

            // Offline devices on top of the Live devices
            dynamicBars.push({
                dataKey: `offline_${type}`,
                name: `${type} (Offline)`,
                color: offlineColors[colorIndex],
                activeColor: offlineColors[colorIndex],
                stackId: 'zone'
            });
        });
    } else {
        dynamicBars.push(
            { dataKey: 'liveCount', name: 'Live Devices', color: '#10b981', activeColor: '#059669', stackId: 'zone' },
            { dataKey: 'offlineCount', name: 'Offline Devices', color: '#f43f5e', activeColor: '#e11d48', stackId: 'zone' }
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Overview Pie Chart */}
            <div className="w-full flex flex-col bg-white/80 backdrop-blur-xl p-6 rounded-2xl border-2 border-slate-200/60 shadow-sm transition-all hover:shadow-md">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center tracking-tight transition-colors">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full mr-3"></span>
                    Connection Overview {selectedZone !== "All" ? `for ${selectedZone}` : ""} {!selectedDeviceType.includes("All") ? `(${selectedDeviceType.join(", ")})` : ""}
                </h3>
                {chartData.every(d => d.value === 0) ? (
                    <div className="w-full h-[350px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed text-slate-400 font-medium transition-colors">
                        No devices found for the selected filters.
                    </div>
                ) : (
                    <div className="w-full h-[350px]">
                        <PieChart
                            data={chartData}
                            colorsMap={{
                                'Live': '#10b981',      // Emerald
                                'Offline': '#f43f5e',   // Rose
                                'Not Functional': '#eab308' // Amber
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Alerts by Device Type Bar Graph */}
            <div className="w-full flex flex-col bg-white/80 backdrop-blur-xl p-6 rounded-2xl border-2 border-slate-200/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-slate-800 flex items-center tracking-tight transition-colors">
                        <span className="w-1.5 h-4 bg-indigo-500 rounded-full mr-3"></span>
                        Alerts by Device Type {selectedZone !== "All" ? `for ${selectedZone}` : ""} {!selectedDeviceType.includes("All") ? `(${selectedDeviceType.join(", ")})` : ""}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded whitespace-nowrap">
                        Click a bar to view alerts
                    </span>
                </div>
                {(!alertStats || alertStats.length === 0 || alertStats.every(d => d.trueAlertCount === 0)) ? (
                    <div className="h-[350px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed text-slate-400 font-medium transition-colors">
                        No alerts found for the selected filters.
                    </div>
                ) : (
                    <div className="h-[350px]">
                        <BarGraph 
                            data={alertStats} 
                            xAxisKey="device_type" 
                            barDataKey="trueAlertCount" 
                            barName="Alert Count"
                            onBarClick={(payload) => {
                                if (setAlertsFilter && payload && payload.device_type) {
                                    setAlertsFilter(payload.device_type);
                                }
                            }}
                        />
                    </div>
                )}
            </div>
            {/* Zone-wise Device Status Bar Graph */}
            <div className="w-full lg:col-span-2 flex flex-col bg-white/80 backdrop-blur-xl p-6 rounded-2xl border-2 border-slate-200/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                    <h3 className="text-sm font-black text-slate-800 flex items-center tracking-tight transition-colors">
                        <span className="w-1.5 h-4 bg-sky-500 rounded-full mr-3"></span>
                        Zone-wise Device Status {!selectedDeviceType.includes("All") ? `(${selectedDeviceType.join(", ")})` : ""}
                    </h3>

                    {/* Custom Premium Legend */}
                    {validDeviceTypes.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-slate-50/50 px-5 py-2.5 rounded-xl border border-slate-200/50 w-full xl:w-auto">
                            <div className="flex flex-wrap items-center gap-5">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest hidden sm:block">Devices</span>
                                {validDeviceTypes.map((type, i) => (
                                    <div key={type} className="flex items-center gap-2 group cursor-default">
                                        <div className="flex items-center rounded-full overflow-hidden shadow-sm transition-transform group-hover:scale-110 ring-1 ring-slate-200">
                                            <span className="w-2.5 h-4" style={{ backgroundColor: liveColors[i % liveColors.length] }} title={`${type} - Live`}></span>
                                            <span className="w-2.5 h-4" style={{ backgroundColor: offlineColors[i % offlineColors.length] }} title={`${type} - Offline`}></span>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{type}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 pl-6 border-l border-slate-200 xl:ml-auto">
                                <div className="flex items-center gap-2" title="Represented by vibrant solid colors">
                                    <span className="w-3.5 h-3.5 rounded-[4px] bg-slate-800 shadow-sm"></span>
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Live (Solid)</span>
                                </div>
                                <div className="flex items-center gap-2" title="Represented by pastel faded colors">
                                    <span className="w-3.5 h-3.5 rounded-[4px] bg-slate-300 shadow-sm opacity-80"></span>
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Offline (Faded)</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {(!zoneStats || zoneStats.length === 0 || zoneStats.every(d => d.liveCount === 0 && d.offlineCount === 0)) ? (
                    <div className="h-[350px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed text-slate-400 font-medium transition-colors">
                        No data available for the selected filters.
                    </div>
                ) : (
                    <div className="h-[350px]">
                        <BarGraph
                            data={zoneStats}
                            xAxisKey="zone"
                            bars={dynamicBars}
                            hideLegend={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
