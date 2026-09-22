import { PieChart as PieChartLib, Pie, Cell, Legend, Tooltip } from 'recharts';
import { OFFICE_CHART_COLORS } from '../../utils/theme';

const RADIAN = Math.PI / 180;

function PieTooltip({ active, payload }) {
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
}

function PieLegend(props) {
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
}

export default function PieChart({ data = [], colorsMap = {}, showPercentages = false }) {
    const PREMIUM_COLORS = OFFICE_CHART_COLORS;
    const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const chartSegments = data.map((entry, index) => ({
        ...entry,
        fill: colorsMap[entry.name] || PREMIUM_COLORS[index % PREMIUM_COLORS.length],
        percentage: total > 0 ? Math.round((Number(entry.value || 0) / total) * 100) : 0
    }));

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    const renderPercentageLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (!showPercentages || !percent) return null;

        const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="15"
                fontWeight="900"
                style={{ paintOrder: 'stroke', stroke: 'rgba(36, 52, 71, 0.22)', strokeWidth: 2 }}
            >
                {`${Math.round(percent * 100)}%`}
            </text>
        );
    };

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
                        data={chartSegments}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        fill={PREMIUM_COLORS[0]}
                        dataKey="value"
                        paddingAngle={5}
                        stroke="none"
                        label={renderPercentageLabel}
                        labelLine={false}
                        animationDuration={400}
                        animationEasing="ease-out"
                    >
                        {chartSegments.map((entry, index) => {
                            const cellColor = entry.fill;
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
                    <Tooltip content={<PieTooltip />} />
                </PieChartLib>
            </div>
            {!showPercentages && (
                <div className="absolute bottom-2 left-0 w-full">
                    <Legend content={<PieLegend />} />
                </div>
            )}
        </div>
    );
}
