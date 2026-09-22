import { useState, useEffect, useMemo } from "react";
import calculate from "../../components/DeviceData/calculate";
import { RefreshCw, Activity, MapPin, Maximize2, Minimize2 } from "lucide-react";

import DeviceFilters from "../../components/DeviceData/DeviceFilters";
import SummaryCards from "../../components/DeviceData/SummaryCards";
import DeviceCharts from "../../components/DeviceData/DeviceCharts";
import DeviceMap from "../../components/DeviceData/DeviceMap";
import { useDeviceStore } from "../../store/useDeviceStore";
import { useNavigate } from "react-router-dom";

export default function ZoneAnalysisOverview() {
    const { deviceData: data, loading: isLoading, error, fetchDeviceData, deviceLocations, fetchDeviceLocations } = useDeviceStore();
    const navigate = useNavigate();

    const [selectedZone, setSelectedZone] = useState("All");
    const [selectedDeviceType, setSelectedDeviceType] = useState(["All"]);
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);

    useEffect(() => {
        fetchDeviceData();
        fetchDeviceLocations();
    }, [fetchDeviceData, fetchDeviceLocations]);

    useEffect(() => {
        const handleOpenDevice = (e) => {
            if (e.detail) {
                navigate(`/zone-analysis/device/${e.detail}`);
            }
        };
        window.addEventListener('openDeviceData', handleOpenDevice);
        return () => window.removeEventListener('openDeviceData', handleOpenDevice);
    }, [navigate]);

    useEffect(() => {
        if (!isMapFullscreen) return undefined;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isMapFullscreen]);

    const zones = useMemo(() => {
        if (!data || data.length === 0) return ["All"];
        const uniqueZones = new Set(data.map(item => item.zone));
        return ["All", ...Array.from(uniqueZones)];
    }, [data]);

    const deviceTypes = useMemo(() => {
        if (!data || data.length === 0) return ["All"];
        const types = new Set();
        data.forEach(zoneEntry => {
            if (selectedZone === "All" || zoneEntry.zone === selectedZone) {
                if (zoneEntry.device_types) {
                    zoneEntry.device_types.forEach(dt => types.add(dt.device_type_name));
                }
            }
        });
        return ["All", ...Array.from(types)];
    }, [data, selectedZone]);

    // Reset device type if the selected zone doesn't have the currently selected device type
    useEffect(() => {
        if (!selectedDeviceType.includes("All")) {
            const validTypes = selectedDeviceType.filter(t => deviceTypes.includes(t));
            let nextSelection = null;

            if (validTypes.length === 0) {
                nextSelection = ["All"];
            } else if (validTypes.length !== selectedDeviceType.length) {
                nextSelection = validTypes;
            }

            if (nextSelection) {
                const timeoutId = setTimeout(() => {
                    setSelectedDeviceType(nextSelection);
                }, 0);

                return () => clearTimeout(timeoutId);
            }
        }
    }, [deviceTypes, selectedDeviceType]);

    const { chartData, calibrationStats, alertStats, zoneStats } = useMemo(() => {
        return calculate(data, { zone: selectedZone, deviceType: selectedDeviceType, status: selectedStatus });
    }, [data, selectedZone, selectedDeviceType, selectedStatus]);


    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-[500px] bg-white/90 backdrop-blur-2xl rounded-3xl shadow-sm border border-slate-200/60 mb-8 transition-all duration-500">
                <RefreshCw className="animate-spin text-indigo-500 mb-4" size={36} strokeWidth={2.5} />
                <span className="text-slate-500 font-bold tracking-wide">Loading device data...</span>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-rose-500 bg-rose-50 rounded-2xl border border-rose-100 font-medium">Error: {error}</div>;
    }

    const liveCount = chartData.find(d => d.name === 'Live')?.value || 0;
    const offlineCount = chartData.find(d => d.name === 'Offline')?.value || 0;

    const mapButtonLabel = isMapFullscreen ? 'Exit Full Screen' : 'Full Screen Map';

    return (
        <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl shadow-sm border border-slate-200/60 mb-8 transition-all duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                <div className="flex items-center gap-4">
                    <div
                        className="p-3.5 rounded-2xl shadow-md shadow-indigo-500/20"
                        style={{ background: 'linear-gradient(135deg, var(--color-office-purple) 0%, var(--color-office-blue) 100%)' }}
                    >
                        <Activity size={28} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight transition-colors">
                            ZoneWise Analysis
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1 transition-colors">Real-time overview of all connected devices and their calibration state.</p>
                    </div>
                </div>

                <DeviceFilters
                    zones={zones}
                    selectedZone={selectedZone}
                    setSelectedZone={setSelectedZone}
                    deviceTypes={deviceTypes}
                    selectedDeviceType={selectedDeviceType}
                    setSelectedDeviceType={setSelectedDeviceType}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                />
            </div>

            {/* Top Row: Summary Cards */}
            <div className="flex flex-col xl:flex-row justify-start items-start gap-6 mb-6">
                <SummaryCards
                    liveCount={liveCount}
                    offlineCount={offlineCount}
                    calibrationStats={calibrationStats}
                    // Instead of setting modal filter state, navigate to the specific route
                    setConnectionFilter={(filter) => navigate(`/zone-analysis/connection?filter=${filter}&zone=${selectedZone}`)}
                    setCalibrationFilter={(filter) => navigate(`/zone-analysis/calibration?filter=${filter}&zone=${selectedZone}`)}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8 items-start">
                {/* Left Column: Map */}
                {isMapFullscreen && (
                    <div className="fixed inset-0 z-[110] bg-slate-950/30 backdrop-blur-[2px]" />
                )}

                <div className={`${isMapFullscreen ? 'fixed inset-6 z-[120]' : 'xl:col-span-6'} flex flex-col h-full`}>
                    {/* Google Map View */}
                    <div className={`flex flex-col flex-grow bg-white/40 rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 backdrop-blur-xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 z-0 relative ${isMapFullscreen ? 'h-full' : 'min-h-0'}`}>
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-linear-to-br from-blue-500/10 to-blue-600/10 rounded-xl shadow-inner border border-blue-500/20">
                                    <MapPin className="text-blue-600" size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Geographical Overview</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Interactive map of all connected devices and their real-time locations</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMapFullscreen((prev) => !prev)}
                                className="inline-flex items-center gap-2 rounded-xl border border-[rgba(79,129,189,0.18)] bg-white/90 px-4 py-2 text-sm font-bold text-[var(--color-office-blue-dark)] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_18px_rgba(79,129,189,0.16)]"
                                title={mapButtonLabel}
                            >
                                {isMapFullscreen ? <Minimize2 size={16} strokeWidth={2.5} /> : <Maximize2 size={16} strokeWidth={2.5} />}
                                {mapButtonLabel}
                            </button>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner ring-4 ring-white/50 relative z-0 flex-grow flex flex-col">
                            <div className="flex-grow relative w-full h-full">
                                <DeviceMap
                                    deviceLocations={deviceLocations}
                                    selectedZone={selectedZone}
                                    selectedDeviceType={selectedDeviceType}
                                    selectedStatus={selectedStatus}
                                    isFullscreen={isMapFullscreen}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Device Charts */}
                <div className="xl:col-span-6 flex flex-col h-full">
                    <DeviceCharts
                        chartData={chartData}
                        alertStats={alertStats}
                        zoneStats={zoneStats}
                        selectedZone={selectedZone}
                        selectedDeviceType={selectedDeviceType}
                        deviceTypes={deviceTypes}
                        setAlertsFilter={(filter) => navigate(`/zone-analysis/alerts?filter=${filter}&zone=${selectedZone}`)}
                    />
                </div>
            </div>
        </div>
    );
}
