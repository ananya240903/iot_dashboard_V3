import React from 'react';
import { PieChart as PieChartLib, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

export default function PieChart({ data = [], colorsMap = {} }) {
    const PREMIUM_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6'];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }}></span>
                            <span className="text-xs font-extrabold text-slate-700 tracking-wide uppercase">{payload[0].name}</span>
                        </div>
                        <span className="text-xl font-black text-slate-900">{payload[0].value.toLocaleString()}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomLegend = (props) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap gap-2 justify-center mb-4 mt-2">
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 rounded-xl border border-slate-200/50 shadow-sm backdrop-blur-sm transition-all hover:scale-105 cursor-default">
                        <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[300px] relative">
            {/* Center decorative element for donut chart */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingTop: '36px' }}>
                <div className="w-16 h-16 rounded-full bg-slate-50/50 border border-slate-100 shadow-inner flex items-center justify-center backdrop-blur-sm z-0 transition-colors">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest transition-colors">Status</span>
                </div>
            </div>
            <div className="w-full h-full flex items-center justify-center z-10">
                <PieChartLib width={280} height={280}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={5}
                        stroke="none"
                        animationDuration={400}
                        animationEasing="ease-out"
                    >
                        {data.map((entry, index) => {
                            const cellColor = colorsMap[entry.name] || PREMIUM_COLORS[index % PREMIUM_COLORS.length];
                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={cellColor}
                                    className="hover:opacity-80 transition-opacity duration-300 outline-none cursor-pointer"
                                    style={{ filter: `drop-shadow(0px 8px 16px ${cellColor}40)` }}
                                />
                            );
                        })}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChartLib>
            </div>
            {/* Absolute positioning for the Legend to stay below the chart */}
            <div className="absolute bottom-2 left-0 w-full">
                <Legend content={<CustomLegend />} />
            </div>
        </div>
    );
}