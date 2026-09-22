import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { OFFICE_CHART_COLORS } from '../../utils/theme';

const COLORS = OFFICE_CHART_COLORS;

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-sm font-extrabold text-slate-500 mb-4 pb-3 border-b border-slate-100">{label}</p>
                <div className="flex flex-col gap-3">
                    {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center justify-between gap-8">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-xs font-bold text-slate-700 tracking-wide">{entry.name}</span>
                            </div>
                            <span className="text-sm font-black text-slate-900">{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const CustomLegend = (props) => {
    const { payload } = props;
    return (
        <div className="flex flex-wrap gap-3 justify-center mb-4 mt-2">
            {payload.map((entry, index) => (
                <div key={`item-${index}`} className="flex items-center gap-2 px-4 py-2 bg-slate-50/80 rounded-xl border border-slate-200/50 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-100 cursor-default">
                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function TrendChart({ data = [], xAxisKey = "date" }) {
    // Process data to format dates if needed
    const processedData = useMemo(() => {
        return data.map(item => {
            let formattedDate = item[xAxisKey];
            try {
                if (formattedDate) {
                    const dateObj = new Date(formattedDate);
                    formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            } catch {
                // Keep original if parsing fails
            }
            return {
                ...item,
                _displayDate: formattedDate || 'Unknown'
            };
        });
    }, [data, xAxisKey]);

    // Extract unique rsTypes (all keys except date and _displayDate)
    const rsTypes = useMemo(() => {
        const keys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== 'date' && key !== '_displayDate') {
                    keys.add(key);
                }
            });
        });
        return Array.from(keys);
    }, [data]);

    const formatYAxis = (tickItem) => {
        if (tickItem >= 1000000) {
            return (tickItem / 1000000).toFixed(1) + 'M';
        } else if (tickItem >= 1000) {
            return (tickItem / 1000).toFixed(1) + 'K';
        }
        return tickItem;
    };

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={processedData}
                    margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 0,
                    }}
                >
                    <defs>
                        {rsTypes.map((type, index) => (
                            <linearGradient key={`grad-${type}`} id={`color-${type}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#EAF0F9" vertical={false} />
                    <XAxis 
                        dataKey="_displayDate" 
                        tick={{ fill: '#5F6B7A', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        dy={15}
                        minTickGap={40}
                    />
                    <YAxis 
                        tickFormatter={formatYAxis}
                        allowDataOverflow
                        tick={{ fill: '#5F6B7A', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-15}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#B8CCE4', strokeWidth: 1, strokeDasharray: '4 4', fill: 'transparent' }} />
                    <Legend content={<CustomLegend />} verticalAlign="top" />
                    {rsTypes.map((type, index) => (
                        <Area 
                            key={type}
                            type="monotone" 
                            dataKey={type} 
                            name={type}
                            stroke={COLORS[index % COLORS.length]} 
                            strokeWidth={2.5}
                            fillOpacity={1} 
                            fill={`url(#color-${type})`}
                            activeDot={{ r: 6, strokeWidth: 3, stroke: '#ffffff', fill: COLORS[index % COLORS.length], style: { filter: 'drop-shadow(0px 2px 4px rgba(56,93,138,0.25))' } }}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
