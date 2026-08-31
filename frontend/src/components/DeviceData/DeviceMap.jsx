import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons when using Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const center = [22.5937, 78.9629];
const defaultZoom = 5;
const zoneGeoJsonFile = 'railway_zone.json';
const trackGeoJsonFile = 'railway_track_cris.json';

const markerColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];
const zoneColors = [
    '#2563eb', '#059669', '#ea580c', '#7c3aed',
    '#db2777', '#0891b2', '#65a30d', '#dc2626',
    '#0f766e', '#9333ea', '#c2410c', '#0284c7'
];

const getMarkerColor = (deviceTypeName) => {
    if (!deviceTypeName) return '#64748b';
    let hash = 0;
    for (let i = 0; i < deviceTypeName.length; i++) {
        hash = deviceTypeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return markerColors[Math.abs(hash) % markerColors.length];
};

const getAssetUrl = (fileName) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${fileName}`;
};

const getZoneColor = (zoneCode) => {
    if (!zoneCode) return '#0f766e';
    let hash = 0;
    const normalizedCode = String(zoneCode).trim().toUpperCase();
    for (let i = 0; i < normalizedCode.length; i++) {
        hash = normalizedCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return zoneColors[Math.abs(hash) % zoneColors.length];
};

const getTrackCasingStyle = (zoom) => ({
    color: '#fff7ed',
    weight: zoom >= 16 ? 7.4 : zoom >= 13 ? 5.8 : zoom >= 10 ? 4.2 : 3,
    opacity: zoom >= 16 ? 0.9 : zoom >= 13 ? 0.82 : zoom >= 10 ? 0.72 : 0.6,
    lineCap: 'round',
    lineJoin: 'round',
});

const getTrackStyle = (zoom) => ({
    color: '#c2410c',
    weight: zoom >= 16 ? 3.2 : zoom >= 13 ? 2.5 : zoom >= 10 ? 1.9 : 1.4,
    opacity: zoom >= 16 ? 0.98 : zoom >= 13 ? 0.92 : zoom >= 10 ? 0.84 : 0.72,
    lineCap: 'round',
    lineJoin: 'round',
});

const getZoneStyle = (zoneColor) => ({
    color: zoneColor,
    weight: 2.2,
    opacity: 0.9,
    dashArray: '10 8',
    fillColor: zoneColor,
    fillOpacity: 0.025
});

const getMarkerDimensions = (zoom, isLive) => {
    if (zoom >= 16) {
        return isLive
            ? { outer: 34, inner: 32, border: 4 }
            : { outer: 28, inner: 26, border: 4 };
    }

    if (zoom >= 14) {
        return isLive
            ? { outer: 28, inner: 26, border: 3 }
            : { outer: 24, inner: 22, border: 3 };
    }

    if (zoom >= 11) {
        return isLive
            ? { outer: 24, inner: 22, border: 3 }
            : { outer: 20, inner: 18, border: 3 };
    }

    if (zoom >= 8) {
        return isLive
            ? { outer: 18, inner: 16, border: 2 }
            : { outer: 14, inner: 12, border: 2 };
    }

    return isLive
        ? { outer: 12, inner: 6, border: 2 }
        : { outer: 10, inner: 5, border: 2 };
};

const getZoneFeatureStyle = (feature, selectedZone) => {
    const zoneColor = getZoneColor(feature?.properties?.Code);
    const activeZone = String(selectedZone || '').trim().toLowerCase();
    const zoneName = String(feature?.properties?.Name || '').trim().toLowerCase();
    const zoneCode = String(feature?.properties?.Code || '').trim().toLowerCase();
    const zoneId = String(feature?.properties?.Zone || '').trim().toLowerCase();
    const isSelectedZone = activeZone && activeZone !== 'all' && (
        activeZone === zoneName ||
        activeZone === zoneCode ||
        activeZone === zoneId
    );

    return isSelectedZone
        ? {
            ...getZoneStyle(zoneColor),
            weight: 3,
            opacity: 1,
            fillOpacity: 0.05,
            dashArray: '12 6'
        }
        : getZoneStyle(zoneColor);
};

const createZoneLayer = (zoneData, selectedZone) => L.geoJSON(zoneData, {
    pane: 'zoneOverlayPane',
    interactive: false,
    style: (feature) => getZoneFeatureStyle(feature, selectedZone),
});

const createTrackCasingLayer = (trackData, zoom) => L.geoJSON(trackData, {
    pane: 'trackCasingOverlayPane',
    interactive: false,
    style: () => getTrackCasingStyle(zoom),
});

const createTrackLayer = (trackData, zoom) => L.geoJSON(trackData, {
    pane: 'trackOverlayPane',
    interactive: false,
    style: () => getTrackStyle(zoom),
});

const iconCache = {};

// Use L.divIcon with Tailwind CSS animations (Hardware Accelerated) instead of SVG <animate>
const getMarkerIcon = (color, isLive, zoom = defaultZoom) => {
    const { outer, inner, border } = getMarkerDimensions(zoom, isLive);
    const key = `${color}-${isLive}-${outer}-${inner}-${border}`;
    if (iconCache[key]) return iconCache[key];

    const html = isLive ? `
        <div class="relative flex items-center justify-center" style="width: ${outer}px; height: ${outer}px;">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${color};"></span>
            <span class="relative inline-flex rounded-full shadow-sm" style="width: ${inner}px; height: ${inner}px; border: ${border}px solid #ffffff; background-color: ${color};"></span>
        </div>
    ` : `
        <div class="relative flex items-center justify-center opacity-80" style="width: ${outer}px; height: ${outer}px;">
            <span class="relative inline-flex rounded-full shadow-sm" style="width: ${inner}px; height: ${inner}px; border: ${border}px solid #ffffff; background-color: ${color};"></span>
        </div>
    `;

    iconCache[key] = L.divIcon({
        html,
        className: 'bg-transparent',
        iconSize: [outer, outer],
        iconAnchor: [outer / 2, outer / 2],
        popupAnchor: [0, -(outer / 2)]
    });

    return iconCache[key];
};

export default function DeviceMap({ deviceLocations, selectedZone, selectedDeviceType, selectedStatus }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersGroupRef = useRef(null);
    const markersDictRef = useRef({});
    const markerMetaRef = useRef({});
    const geoJsonDataRef = useRef({ zones: null, tracks: null });
    const geoJsonLayersRef = useRef({ zones: null });
    const trackCasingLayerRef = useRef(null);
    const tracksLayerRef = useRef(null);

    const [searchValue, setSearchValue] = useState('');
    const [searchError, setSearchError] = useState('');
    const [showZones, setShowZones] = useState(false);
    const [showTracks, setShowTracks] = useState(false);
    const [overlayLoading, setOverlayLoading] = useState({ zones: false, tracks: false });
    const [overlayError, setOverlayError] = useState('');

    const validDevices = useMemo(() => {
        if (!deviceLocations) return [];
        return deviceLocations.filter((device) => {
            const hasCoords = device.latitude !== null &&
                device.latitude !== undefined &&
                device.longitude !== null &&
                device.longitude !== undefined &&
                !isNaN(parseFloat(device.latitude)) &&
                !isNaN(parseFloat(device.longitude));

            if (!hasCoords) return false;

            const safeSelectedZone = String(selectedZone || '').trim().toLowerCase();
            const safeDeviceZone = String(device.zone || '').trim().toLowerCase();
            const isAllZone = !safeSelectedZone || safeSelectedZone === 'all';
            const matchesZone = isAllZone || safeDeviceZone === safeSelectedZone;

            const isAllType = !selectedDeviceType || selectedDeviceType.length === 0 || selectedDeviceType.includes('All');

            const safeDeviceTypeName = String(device.device_type_name || '').trim().toLowerCase();
            const safeDeviceTypeId = String(device.device_type_id || '').trim().toLowerCase();

            const matchesType = isAllType || selectedDeviceType.some((type) => {
                const safeType = String(type).trim().toLowerCase();
                return safeDeviceTypeName === safeType || safeDeviceTypeId === safeType;
            });

            const status = device.status ? device.status.toLowerCase() : 'offline';
            const isLive = status === 'live' || status === 'online';
            const normalizedStatus = isLive ? 'Live' : 'Offline';

            const isAllStatus = !selectedStatus || selectedStatus === 'All';
            const matchesStatus = isAllStatus || normalizedStatus === selectedStatus;

            return matchesZone && matchesType && matchesStatus;
        });
    }, [deviceLocations, selectedZone, selectedDeviceType, selectedStatus]);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // preferCanvas: true improves performance for maps with many elements
        const map = L.map(mapRef.current, { preferCanvas: true }).setView(center, defaultZoom);
        mapInstanceRef.current = map;

        const zonePane = map.createPane('zoneOverlayPane');
        zonePane.style.zIndex = '390';
        zonePane.style.pointerEvents = 'none';

        const trackCasingPane = map.createPane('trackCasingOverlayPane');
        trackCasingPane.style.zIndex = '395';
        trackCasingPane.style.pointerEvents = 'none';

        const trackPane = map.createPane('trackOverlayPane');
        trackPane.style.zIndex = '400';
        trackPane.style.pointerEvents = 'none';

        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&gl=IN', {
            attribution: '&copy; Google Maps',
            maxZoom: 20
        }).addTo(map);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const updateMarkerIconsForZoom = () => {
            const zoom = map.getZoom();
            Object.values(markerMetaRef.current).forEach(({ marker, color, isLive }) => {
                marker.setIcon(getMarkerIcon(color, isLive, zoom));
            });

            if (trackCasingLayerRef.current) {
                trackCasingLayerRef.current.setStyle(getTrackCasingStyle(zoom));
            }

            if (tracksLayerRef.current) {
                tracksLayerRef.current.setStyle(getTrackStyle(zoom));
            }
        };

        map.on('zoomend', updateMarkerIconsForZoom);

        return () => {
            map.off('zoomend', updateMarkerIconsForZoom);
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (markersGroupRef.current) {
            markersGroupRef.current.clearLayers();
            map.removeLayer(markersGroupRef.current);
        }

        const layerGroup = L.layerGroup();
        markersDictRef.current = {};
        markerMetaRef.current = {};

        // 1. Hardware accelerated CSS markers (L.divIcon) instead of SVG animations
        // 2. RequestAnimationFrame chunking to keep the UI responsive with many markers
        let currentIndex = 0;
        const chunkSize = 100;
        let animationFrameId;
        let isLayerAdded = false;
        const currentZoom = map.getZoom();

        const processChunk = () => {
            const end = Math.min(currentIndex + chunkSize, validDevices.length);

            for (let i = currentIndex; i < end; i++) {
                const device = validDevices[i];
                const popupContent = `
                    <div class="p-1 text-slate-800 min-w-[200px]">
                        <h3 class="font-bold text-lg border-b pb-1 mb-2">${device.device_name || `Device ${device.device_id}`}</h3>
                        <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                            <span class="font-medium text-slate-500 text-right">Type:</span>
                            <span class="truncate font-semibold" title="${device.device_type_name || device.device_type_id}">
                                ${device.device_type_name || device.device_type_id}
                            </span>

                            <span class="font-medium text-slate-500 text-right">Vendor:</span>
                            <span class="truncate font-semibold" title="${device.vendor_name || 'N/A'}">
                                ${device.vendor_name || 'N/A'}
                            </span>

                            <span class="font-medium text-slate-500 text-right">Zone:</span>
                            <span class="truncate">${device.zone || 'N/A'}</span>

                            <span class="font-medium text-slate-500 text-right">Site:</span>
                            <span class="truncate" title="${device.site || 'N/A'}">${device.site || 'N/A'}</span>

                            <span class="font-medium text-slate-500 text-right">Station Code:</span>
                            <span class="truncate">${device.station_code || 'N/A'}</span>

                            <span class="font-medium text-slate-500 text-right">Lat:</span>
                            <span>${device.latitude}</span>

                            <span class="font-medium text-slate-500 text-right">Lng:</span>
                            <span>${device.longitude}</span>
                        </div>
                        <button
                            onclick="window.dispatchEvent(new CustomEvent('openDeviceData', {detail: '${device.device_id}'}))"
                            class="mt-4 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 font-semibold py-1.5 px-3 rounded-lg text-sm transition-colors"
                        >
                            See All Data
                        </button>
                    </div>
                `;

                const markerColor = getMarkerColor(device.device_type_name || device.device_type_id);
                const status = device.status ? device.status.toLowerCase() : 'offline';
                const isLive = status === 'live' || status === 'online';
                const customIcon = getMarkerIcon(markerColor, isLive, currentZoom);

                const marker = L.marker([parseFloat(device.latitude), parseFloat(device.longitude)], { icon: customIcon })
                    .bindPopup(popupContent);

                layerGroup.addLayer(marker);

                const markerKey = device.device_id ? device.device_id.toString() : `marker-${i}`;
                markerMetaRef.current[markerKey] = {
                    marker,
                    color: markerColor,
                    isLive
                };

                if (device.device_id) {
                    markersDictRef.current[device.device_id.toString()] = marker;
                }
            }

            currentIndex = end;

            if (!isLayerAdded) {
                map.addLayer(layerGroup);
                markersGroupRef.current = layerGroup;
                isLayerAdded = true;
            }

            if (currentIndex < validDevices.length) {
                animationFrameId = requestAnimationFrame(processChunk);
            }
        };

        const startTimeout = setTimeout(() => {
            animationFrameId = requestAnimationFrame(processChunk);
        }, 50);

        return () => {
            clearTimeout(startTimeout);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [validDevices]);

    useEffect(() => {
        if (!searchError) return undefined;
        const timeoutId = setTimeout(() => setSearchError(''), 3000);
        return () => clearTimeout(timeoutId);
    }, [searchError]);

    useEffect(() => {
        if (!overlayError) return undefined;
        const timeoutId = setTimeout(() => setOverlayError(''), 4000);
        return () => clearTimeout(timeoutId);
    }, [overlayError]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        let isCancelled = false;

        const setLoading = (key, value) => {
            setOverlayLoading((prev) => ({ ...prev, [key]: value }));
        };

        const loadGeoJson = async (key, fileName) => {
            if (geoJsonDataRef.current[key]) return geoJsonDataRef.current[key];

            const response = await fetch(getAssetUrl(fileName));
            if (!response.ok) {
                throw new Error(`Unable to load ${fileName}`);
            }

            const data = await response.json();
            geoJsonDataRef.current[key] = data;
            return data;
        };

        const syncZones = async () => {
            const existingLayer = geoJsonLayersRef.current.zones;

            if (!showZones) {
                if (existingLayer && map.hasLayer(existingLayer)) {
                    map.removeLayer(existingLayer);
                }
                return;
            }

            try {
                setLoading('zones', true);
                const data = await loadGeoJson('zones', zoneGeoJsonFile);
                if (isCancelled) return;

                let layer = geoJsonLayersRef.current.zones;
                if (!layer) {
                    layer = createZoneLayer(data, selectedZone);
                    geoJsonLayersRef.current.zones = layer;
                } else {
                    layer.setStyle((feature) => getZoneFeatureStyle(feature, selectedZone));
                }

                if (!map.hasLayer(layer)) {
                    layer.addTo(map);
                }
            } catch (error) {
                if (!isCancelled) {
                    setOverlayError('Unable to load zone boundaries.');
                    setShowZones(false);
                }
            } finally {
                if (!isCancelled) {
                    setLoading('zones', false);
                }
            }
        };

        const syncTracks = async () => {
            const existingCasingLayer = trackCasingLayerRef.current;
            const existingTrackLayer = tracksLayerRef.current;

            if (!showTracks) {
                if (existingCasingLayer && map.hasLayer(existingCasingLayer)) {
                    map.removeLayer(existingCasingLayer);
                }

                if (existingTrackLayer && map.hasLayer(existingTrackLayer)) {
                    map.removeLayer(existingTrackLayer);
                }
                return;
            }

            try {
                setLoading('tracks', true);
                const data = await loadGeoJson('tracks', trackGeoJsonFile);
                if (isCancelled) return;

                const zoom = map.getZoom();

                let casingLayer = trackCasingLayerRef.current;
                if (!casingLayer) {
                    casingLayer = createTrackCasingLayer(data, zoom);
                    trackCasingLayerRef.current = casingLayer;
                } else {
                    casingLayer.setStyle(getTrackCasingStyle(zoom));
                }

                let trackLayer = tracksLayerRef.current;
                if (!trackLayer) {
                    trackLayer = createTrackLayer(data, zoom);
                    tracksLayerRef.current = trackLayer;
                } else {
                    trackLayer.setStyle(getTrackStyle(zoom));
                }

                if (!map.hasLayer(casingLayer)) {
                    casingLayer.addTo(map);
                }

                if (!map.hasLayer(trackLayer)) {
                    trackLayer.addTo(map);
                }
            } catch (error) {
                if (!isCancelled) {
                    setOverlayError('Unable to load railway tracks.');
                    setShowTracks(false);
                }
            } finally {
                if (!isCancelled) {
                    setLoading('tracks', false);
                }
            }
        };

        void syncZones();
        void syncTracks();

        return () => {
            isCancelled = true;
        };
    }, [selectedZone, showTracks, showZones]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchError('');
        if (!searchValue.trim()) return;

        const targetId = searchValue.trim();
        const marker = markersDictRef.current[targetId];

        if (marker) {
            const latlng = marker.getLatLng();
            mapInstanceRef.current.flyTo(latlng, 16, { duration: 1.5 });
            setTimeout(() => {
                marker.openPopup();
            }, 250);
        } else {
            setSearchError('Device not found on map.');
        }
    };

    return (
        <div className="relative overflow-hidden w-full h-full min-h-[400px]" style={{ zIndex: 0 }}>
            <div ref={mapRef} className="absolute inset-0" />

            <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-3 pointer-events-none">
                <div className="flex flex-col items-end gap-2 pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => setShowZones((prev) => !prev)}
                        disabled={overlayLoading.zones}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all ${
                            showZones
                                ? 'border-sky-100 bg-white/95 text-slate-700 hover:bg-white'
                                : 'border-slate-200 bg-white/92 text-slate-600 hover:bg-white'
                        } ${overlayLoading.zones ? 'cursor-wait opacity-70' : ''}`}
                    >
                        <span className={`h-2.5 w-2.5 rounded-full ${showZones ? 'bg-sky-500' : 'bg-slate-300'}`}></span>
                        {overlayLoading.zones ? 'Loading Zones...' : (showZones ? 'Hide Zones' : 'Show Zones')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTracks((prev) => !prev)}
                        disabled={overlayLoading.tracks}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all ${
                            showTracks
                                ? 'border-emerald-100 bg-white/95 text-slate-700 hover:bg-white'
                                : 'border-slate-200 bg-white/92 text-slate-600 hover:bg-white'
                        } ${overlayLoading.tracks ? 'cursor-wait opacity-70' : ''}`}
                    >
                        <span className={`h-2.5 w-2.5 rounded-full ${showTracks ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        {overlayLoading.tracks ? 'Loading Tracks...' : (showTracks ? 'Hide Tracks' : 'Show Tracks')}
                    </button>
                    {overlayError && (
                        <div className="max-w-[220px] rounded-2xl border border-rose-200 bg-white/95 px-3 py-2 text-xs font-semibold text-rose-500 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
                            {overlayError}
                        </div>
                    )}
                </div>

                <form
                    onSubmit={handleSearch}
                    className="flex items-center bg-white/95 backdrop-blur-md border border-slate-200 p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto transition-all focus-within:ring-2 focus-within:ring-indigo-500/50"
                >
                    <input
                        type="text"
                        placeholder="Search Device ID..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="bg-transparent border-none outline-none px-4 py-1 text-sm font-bold text-slate-700 placeholder-slate-400 w-[180px] focus:w-[220px] transition-all"
                    />
                    <button type="submit" className="p-2 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white transition-colors shadow-md">
                        <Search size={16} strokeWidth={3} />
                    </button>
                </form>
                {searchError && (
                    <div className="mt-3 bg-rose-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md animate-in fade-in slide-in-from-top-2 pointer-events-auto">
                        {searchError}
                    </div>
                )}
            </div>
        </div>
    );
}
