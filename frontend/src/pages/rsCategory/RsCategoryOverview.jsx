import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { AlertTriangle, AlertCircle, RefreshCw, X, Search, Train } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../../utils/api';
import { useRsCategoryStore } from '../../store/useRsCategoryStore';
import { COLORS, eChartsTooltipStylesHTML } from '../../utils/echartsUtils';

const CATEGORY_COLORS = {
  'WAGON': '#4F81BD',
  'COACH': '#F79646',
  'LOCO': '#4BACC6',
  'Others': '#9BBB59',
  'EMU': '#8064A2',
  'Train18': '#C0504D',
  'UNKNOWN': '#7F7F7F'
};

export default function RsCategoryOverview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    totalAlerts, repeatedAlerts, loading, error,
    fetchCategoryData, setSelectedAlert,
  } = useRsCategoryStore();

  const urlSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  useEffect(() => {
    fetchCategoryData();
  }, []);

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchParams({});
      return;
    }
    navigate(`/alerts/vehicle/${searchQuery.trim()}`);
  };

  // Navigate to category detail page
  const handleCategoryNavigate = (category) => {
    navigate(`/alerts/rs-category/${category}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full w-full gap-4 animate-fade-in-up mt-20">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-500/20"></div>
        <span className="font-bold tracking-widest uppercase text-sm text-indigo-600">Loading Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-3" />
          <p className="text-red-700 font-medium">Error loading alerts: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <style>{eChartsTooltipStylesHTML}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <Train className="text-indigo-600" size={32} />
            RollingStock Category Alerts Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Real-time breakdown of rolling stock alerts by category
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by RS Number..."
              className="pl-10 pr-10 py-3 bg-white/70 border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64 transition-all placeholder-slate-400 text-slate-700 backdrop-blur-md font-medium"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchParams({}); setSearchQuery(''); }} className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
            <button type="submit" disabled={!searchQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors">
              <Search size={16} />
            </button>
          </form>
        </div>
      </div>



      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-sm hover:shadow-lg border border-slate-200/60 transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">Alert Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={totalAlerts}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={(state) => {
                  let category = null;
                  if (state?.activePayload?.length > 0) category = state.activePayload[0].payload.category;
                  else if (state?.activeLabel) category = state.activeLabel;
                  if (category) handleCategoryNavigate(category);
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} dx={-10} />
                <RechartsTooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px', fontWeight: 'bold' }} />
                <Bar dataKey="totalAlerts" radius={[6, 6, 0, 0]} onClick={(data) => { if (data?.category) handleCategoryNavigate(data.category); }} className="hover:opacity-80 transition-opacity">
                  {totalAlerts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-sm hover:shadow-lg border border-slate-200/60 transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">Alert Share</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalAlerts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="totalAlerts"
                  nameKey="category"
                  stroke="none"
                  onClick={(data) => { if (data?.category) handleCategoryNavigate(data.category); }}
                  className="cursor-pointer"
                >
                  {totalAlerts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Alerts by Category Table ─────────────────────────────────────────── */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-sm hover:shadow-lg border border-slate-200/60 overflow-hidden transition-all duration-300 hover:-translate-y-1 delay-100">
        <div className="p-6 border-b border-slate-100/50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
              <RefreshCw size={22} className="text-amber-500 animate-[spin_4s_linear_infinite]" />
              Alerts by Category
            </h3>
            <p className="text-sm text-slate-500 mt-1">Click a category row to drill down into vehicle list</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="py-4 px-6 font-semibold text-sm text-slate-600">Category</th>
                <th className="py-4 px-6 font-semibold text-sm text-slate-600">Total Rolling Stock with Alerts (Based on RsNo and Position)</th>
                <th className="py-4 px-6 font-semibold text-sm text-slate-600">Highest Repeated Vehicle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...repeatedAlerts].sort((a, b) => b.total_count - a.total_count).map((catGroup, idx) => {
                const topVehicle = catGroup.repeated_Alerts?.length > 0
                  ? catGroup.repeated_Alerts.reduce((max, obj) => (obj.times > max.times ? obj : max))
                  : null;

                return (
                  <tr
                    key={idx}
                    onClick={() => handleCategoryNavigate(catGroup.category)}
                    className="group/row transition-all duration-300 relative hover:bg-white hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer z-0 hover:z-10"
                  >
                    <td className="py-4 px-6 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-0 group-hover/row:opacity-100 transition-opacity"></div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {catGroup.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-lg font-bold text-slate-700">{catGroup.total_count}</span>
                    </td>
                    <td className="py-4 px-6">
                      {topVehicle ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">RS No: {topVehicle.rsNo}</span>
                          <span className="text-xs text-red-500 font-medium">Repeated {topVehicle.times} times (Pos: {topVehicle.position})</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {repeatedAlerts.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-500">No repeated alerts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
