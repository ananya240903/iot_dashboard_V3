import React from 'react';

export default function SummaryCards({
    liveCount,
    offlineCount,
    calibrationStats,
    setConnectionFilter,
    setCalibrationFilter
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full xl:w-auto">
            {/* Connection Status Card */}
            <div 
                className="group bg-white/80 backdrop-blur-xl p-5 rounded-2xl border-2 border-transparent shadow-sm hover:shadow-md hover:border-slate-300/50 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-slate-50/50 before:to-transparent before: before:opacity-0 before:transition-opacity hover:before:opacity-100"
                onClick={() => setConnectionFilter('all')}
                title="Click to view all connection details"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-6 z-10 w-full justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-indigo-400 transition-colors"></div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Connection Status</h3>
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-indigo-400 transition-colors"></div>
                </div>

                <div className="flex gap-12 z-10">
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-emerald-50 transition-colors cursor-pointer border border-transparent hover:border-emerald-100 shadow-sm hover:shadow-emerald-500/10"
                        onClick={(e) => { e.stopPropagation(); setConnectionFilter('live'); }}
                        title="Click to view Live devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-emerald-600 transition-colors">Live</p>
                        <p className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-emerald-600 tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{liveCount}</p>
                    </div>
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-100 shadow-sm hover:shadow-rose-500/10"
                        onClick={(e) => { e.stopPropagation(); setConnectionFilter('offline'); }}
                        title="Click to view Offline devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-rose-600 transition-colors">Offline</p>
                        <p className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-rose-400 to-rose-600 tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{offlineCount}</p>
                    </div>
                </div>
            </div>

            {/* Calibration Status Card */}
            <div 
                className="group bg-white/80 backdrop-blur-xl p-5 rounded-2xl border-2 border-transparent shadow-sm hover:shadow-md hover:border-slate-300/50 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-slate-50/50 before:to-transparent before: before:opacity-0 before:transition-opacity hover:before:opacity-100"
                onClick={() => setCalibrationFilter('all')}
                title="Click to view all calibration details"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-6 z-10 w-full justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-indigo-400 transition-colors"></div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Calibration Status</h3>
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-indigo-400 transition-colors"></div>
                </div>

                <div className="flex gap-6 z-10">
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-100 shadow-sm hover:shadow-blue-500/10" 
                        onClick={(e) => { e.stopPropagation(); setCalibrationFilter('valid'); }}
                        title="Click to view Valid devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-blue-600 transition-colors">Valid</p>
                        <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-blue-600 tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{calibrationStats.valid}</p>
                    </div>
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-orange-50 transition-colors cursor-pointer border border-transparent hover:border-orange-100 shadow-sm hover:shadow-orange-500/10" 
                        onClick={(e) => { e.stopPropagation(); setCalibrationFilter('overdue'); }}
                        title="Click to view Overdue devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-orange-600 transition-colors">Overdue</p>
                        <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-orange-400 to-orange-600 tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{calibrationStats.overdue}</p>
                    </div>
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 shadow-sm hover:shadow-slate-500/10" 
                        onClick={(e) => { e.stopPropagation(); setCalibrationFilter('unknown'); }}
                        title="Click to view Unknown devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-slate-600 transition-colors">Unknown</p>
                        <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-400 to-slate-600 tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{calibrationStats.unknown}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
