import PieChart from '../PieChart/Piechart';
import BarGraph from '../BarGraph/BarGraph';
import { OFFICE_CHART_COLORS, OFFICE_STATUS_COLORS } from '../../utils/theme';

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
    const liveColors = OFFICE_CHART_COLORS;
    const offlineColors = ['#DCE6F2', '#F2DCDB', '#EAF1DD', '#E6E0EC', '#DAEEF3', '#FDEADA', '#D6E3BC', '#CCC1D9'];

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
            { dataKey: 'liveCount', name: 'Live Devices', color: OFFICE_STATUS_COLORS.live, activeColor: '#76923C', stackId: 'zone' },
            { dataKey: 'offlineCount', name: 'Offline Devices', color: OFFICE_STATUS_COLORS.offline, activeColor: '#953735', stackId: 'zone' }
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Overview Pie Chart */}
            <div className="w-full flex flex-col bg-[rgba(255,255,255,0.84)] backdrop-blur-xl p-6 rounded-2xl border border-[rgba(121,151,188,0.16)] shadow-[0_10px_24px_rgba(56,93,138,0.07)] transition-all hover:shadow-[0_14px_30px_rgba(56,93,138,0.12)]">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center tracking-tight transition-colors">
                    <span className="w-1.5 h-4 bg-[var(--color-office-green)] rounded-full mr-3"></span>
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
                                'Live': OFFICE_STATUS_COLORS.live,
                                'Offline': OFFICE_STATUS_COLORS.offline,
                                'Not Functional': OFFICE_STATUS_COLORS.warning
                            }}
                            showPercentages={true}
                        />
                    </div>
                )}
            </div>

            {/* Alerts by Device Type Bar Graph */}
            <div className="w-full flex flex-col bg-[rgba(255,255,255,0.84)] backdrop-blur-xl p-6 rounded-2xl border border-[rgba(121,151,188,0.16)] shadow-[0_10px_24px_rgba(56,93,138,0.07)] transition-all hover:shadow-[0_14px_30px_rgba(56,93,138,0.12)]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-slate-800 flex items-center tracking-tight transition-colors">
                        <span className="w-1.5 h-4 bg-[var(--color-office-blue)] rounded-full mr-3"></span>
                        Alerts by Device Type {selectedZone !== "All" ? `for ${selectedZone}` : ""} {!selectedDeviceType.includes("All") ? `(${selectedDeviceType.join(", ")})` : ""}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-office-blue-dark)] bg-[rgba(220,230,242,0.85)] px-2 py-1 rounded whitespace-nowrap">
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
            <div className="w-full lg:col-span-2 flex flex-col bg-[rgba(255,255,255,0.84)] backdrop-blur-xl p-6 rounded-2xl border border-[rgba(121,151,188,0.16)] shadow-[0_10px_24px_rgba(56,93,138,0.07)] transition-all hover:shadow-[0_14px_30px_rgba(56,93,138,0.12)]">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                    <h3 className="text-sm font-black text-slate-800 flex items-center tracking-tight transition-colors">
                        <span className="w-1.5 h-4 bg-[var(--color-office-teal)] rounded-full mr-3"></span>
                        Zone-wise Device Status {!selectedDeviceType.includes("All") ? `(${selectedDeviceType.join(", ")})` : ""}
                    </h3>

                    {/* Custom Premium Legend */}
                    {validDeviceTypes.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-[rgba(244,247,251,0.86)] px-5 py-2.5 rounded-xl border border-[rgba(121,151,188,0.14)] w-full xl:w-auto">
                            <div className="flex flex-wrap items-center gap-5">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest hidden sm:block">Devices</span>
                                {validDeviceTypes.map((type, i) => (
                                    <div key={type} className="flex items-center gap-2 group cursor-default">
                                        <div className="flex items-center rounded-full overflow-hidden shadow-sm transition-transform group-hover:scale-110 ring-1 ring-[rgba(121,151,188,0.18)]">
                                            <span className="w-2.5 h-4" style={{ backgroundColor: liveColors[i % liveColors.length] }} title={`${type} - Live`}></span>
                                            <span className="w-2.5 h-4" style={{ backgroundColor: offlineColors[i % offlineColors.length] }} title={`${type} - Offline`}></span>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{type}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 pl-6 border-l border-slate-200 xl:ml-auto">
                                <div className="flex items-center gap-2" title="Represented by vibrant solid colors">
                                    <span className="w-3.5 h-3.5 rounded-[4px] bg-[var(--color-office-blue)] shadow-sm"></span>
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Live (Solid)</span>
                                </div>
                                <div className="flex items-center gap-2" title="Represented by pastel faded colors">
                                    <span className="w-3.5 h-3.5 rounded-[4px] bg-[rgba(220,230,242,0.95)] shadow-sm opacity-90"></span>
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
