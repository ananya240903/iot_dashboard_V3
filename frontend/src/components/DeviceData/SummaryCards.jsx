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
                className="group bg-[rgba(255,255,255,0.84)] backdrop-blur-xl p-5 rounded-2xl border border-[rgba(121,151,188,0.16)] shadow-[0_10px_24px_rgba(56,93,138,0.07)] hover:shadow-[0_14px_30px_rgba(56,93,138,0.12)] hover:border-[rgba(121,151,188,0.28)] transition-all duration-300 cursor-pointer flex flex-col justify-center items-center relative overflow-hidden before:absolute before:inset-0 before:bg-linear-to-br before:from-[rgba(220,230,242,0.52)] before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100"
                onClick={() => setConnectionFilter('all')}
                title="Click to view all connection details"
            >
                <div className="absolute inset-0 bg-linear-to-br from-[rgba(220,230,242,0.56)] to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-6 z-10 w-full justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-[var(--color-office-blue)] transition-colors"></div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-[var(--color-office-blue)] transition-colors">Connection Status</h3>
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-[var(--color-office-blue)] transition-colors"></div>
                </div>

                <div className="flex gap-12 z-10">
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-[rgba(234,241,221,0.85)] transition-colors cursor-pointer border border-transparent hover:border-[rgba(155,187,89,0.3)] shadow-sm hover:shadow-[0_10px_20px_rgba(155,187,89,0.12)]"
                        onClick={(e) => { e.stopPropagation(); setConnectionFilter('live'); }}
                        title="Click to view Live devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-[var(--color-office-green)] transition-colors">Live</p>
                        <p className="text-5xl font-black bg-clip-text text-transparent bg-linear-to-br from-[var(--color-office-green)] to-[#76923C] tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{liveCount}</p>
                    </div>
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-[rgba(242,220,219,0.85)] transition-colors cursor-pointer border border-transparent hover:border-[rgba(192,80,77,0.26)] shadow-sm hover:shadow-[0_10px_20px_rgba(192,80,77,0.12)]"
                        onClick={(e) => { e.stopPropagation(); setConnectionFilter('offline'); }}
                        title="Click to view Offline devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-[var(--color-office-red)] transition-colors">Offline</p>
                        <p className="text-5xl font-black bg-clip-text text-transparent bg-linear-to-br from-[var(--color-office-red)] to-[#953735] tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{offlineCount}</p>
                    </div>
                </div>
            </div>

            {/* Calibration Status Card */}
            <div 
                className="group bg-[rgba(255,255,255,0.84)] backdrop-blur-xl p-5 rounded-2xl border border-[rgba(121,151,188,0.16)] shadow-[0_10px_24px_rgba(56,93,138,0.07)] hover:shadow-[0_14px_30px_rgba(56,93,138,0.12)] hover:border-[rgba(121,151,188,0.28)] transition-all duration-300 cursor-pointer flex flex-col justify-center items-center relative overflow-hidden before:absolute before:inset-0 before:bg-linear-to-br before:from-[rgba(220,230,242,0.52)] before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100"
                onClick={() => setCalibrationFilter('all')}
                title="Click to view all calibration details"
            >
                <div className="absolute inset-0 bg-linear-to-br from-[rgba(220,230,242,0.56)] to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-6 z-10 w-full justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-[var(--color-office-blue)] transition-colors"></div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-[var(--color-office-blue)] transition-colors">Calibration Status</h3>
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-[var(--color-office-blue)] transition-colors"></div>
                </div>

                <div className="flex gap-6 z-10">
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-[rgba(218,238,243,0.85)] transition-colors cursor-pointer border border-transparent hover:border-[rgba(75,172,198,0.26)] shadow-sm hover:shadow-[0_10px_20px_rgba(75,172,198,0.12)]" 
                        onClick={(e) => { e.stopPropagation(); setCalibrationFilter('valid'); }}
                        title="Click to view Valid devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-[var(--color-office-teal)] transition-colors">Valid</p>
                        <p className="text-4xl font-black bg-clip-text text-transparent bg-linear-to-br from-[var(--color-office-teal)] to-[#31859B] tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{calibrationStats.valid}</p>
                    </div>
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-[rgba(253,234,218,0.85)] transition-colors cursor-pointer border border-transparent hover:border-[rgba(247,150,70,0.28)] shadow-sm hover:shadow-[0_10px_20px_rgba(247,150,70,0.12)]" 
                        onClick={(e) => { e.stopPropagation(); setCalibrationFilter('overdue'); }}
                        title="Click to view Overdue devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-[var(--color-office-orange)] transition-colors">Overdue</p>
                        <p className="text-4xl font-black bg-clip-text text-transparent bg-linear-to-br from-[var(--color-office-orange)] to-[#E36C09] tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{calibrationStats.overdue}</p>
                    </div>
                    <div 
                        className="text-center group/item p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 shadow-sm hover:shadow-slate-500/10" 
                        onClick={(e) => { e.stopPropagation(); setCalibrationFilter('unknown'); }}
                        title="Click to view Unknown devices"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-slate-600 transition-colors">Unknown</p>
                        <p className="text-4xl font-black bg-clip-text text-transparent bg-linear-to-br from-slate-400 to-slate-600 tracking-tighter group-hover/item:scale-105 transition-transform duration-300">{calibrationStats.unknown}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
