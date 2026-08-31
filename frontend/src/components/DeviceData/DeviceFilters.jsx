import React, { useState, useRef, useEffect, startTransition } from 'react';

export default function DeviceFilters({
    zones,
    selectedZone,
    setSelectedZone,
    deviceTypes,
    selectedDeviceType,
    setSelectedDeviceType,
    selectedStatus,
    setSelectedStatus
}) {
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTypeSelect = (type) => {
        if (type === "All") {
            setIsTypeDropdownOpen(false);
            startTransition(() => {
                setSelectedDeviceType(["All"]);
            });
            return;
        }

        let newSelected = [...selectedDeviceType];
        if (newSelected.includes("All")) {
            newSelected = [];
        }

        if (newSelected.includes(type)) {
            newSelected = newSelected.filter(t => t !== type);
            if (newSelected.length === 0) {
                newSelected = ["All"];
            }
        } else {
            newSelected.push(type);
        }

        startTransition(() => {
            setSelectedDeviceType(newSelected);
        });
    };

    return (
        <div className="flex flex-wrap gap-4 bg-white p-2.5 rounded-2xl border border-slate-200/70 shadow-sm transition-colors">
            <div className="flex items-center gap-3 px-3">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Zone</label>
                <select
                    value={selectedZone}
                    onChange={(e) => {
                        const val = e.target.value;
                        startTransition(() => setSelectedZone(val));
                    }}
                    className="py-2 pr-8 bg-transparent text-slate-700 font-bold text-sm focus:outline-none focus:ring-0 cursor-pointer appearance-none transition-colors"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                >
                    {zones.map(zone => (
                        <option className="bg-white text-slate-900" key={zone} value={zone}>{zone}</option>
                    ))}
                </select>
            </div>

            <div className="w-px h-8 bg-slate-200"></div>

            <div className="flex items-center gap-3 px-3" ref={dropdownRef}>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Type</label>
                
                <div className="relative">
                    <button
                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                        disabled={deviceTypes.length <= 1}
                        className="flex items-center gap-2 py-2 pr-2 bg-transparent text-slate-700 font-bold text-sm focus:outline-none cursor-pointer disabled:opacity-50 transition-colors"
                    >
                        <span className="truncate max-w-[120px]">
                            {selectedDeviceType.includes("All") ? "All" : selectedDeviceType.join(", ")}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-[1.2em] h-[1.2em] transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`}>
                            <path d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>

                    {isTypeDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                            {deviceTypes.map(type => (
                                <div 
                                    key={type}
                                    onClick={() => handleTypeSelect(type)}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedDeviceType.includes(type) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 '}`}>
                                        {selectedDeviceType.includes(type) && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">{type}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-200"></div>

            <div className="flex items-center gap-3 px-3">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Status</label>
                <select
                    value={selectedStatus}
                    onChange={(e) => {
                        const val = e.target.value;
                        startTransition(() => setSelectedStatus(val));
                    }}
                    className="py-2 pr-8 bg-transparent text-slate-700 font-bold text-sm focus:outline-none focus:ring-0 cursor-pointer appearance-none transition-colors"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                >
                    <option className="bg-white text-slate-900" value="All">All</option>
                    <option className="bg-white text-slate-900" value="Live">Live</option>
                    <option className="bg-white text-slate-900" value="Offline">Offline</option>
                </select>
            </div>
        </div>
    );
}
