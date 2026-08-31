import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, AlertCircle, ArrowLeft } from 'lucide-react';
import { fetchApi } from '../../utils/api';
import { useRsCategoryStore } from '../../store/useRsCategoryStore';

export default function VehicleAlertsSearch() {
  const { vehicleNo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedAlert } = useRsCategoryStore();

  const [isSearching, setIsSearching] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (vehicleNo) {
      performSearch(vehicleNo);
    }
  }, [vehicleNo]);

  const performSearch = async (query) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const json = await fetchApi(`/RsCategory/alerts/search/${query}`);
      if (json.success && json.data?.length > 0) {
        setSearchResults({
          rsNo: query,
          alerts: json.data.sort((a, b) => b.times - a.times),
          totalAlerts: json.totalAlerts,
          totalNormal: json.totalNormal,
        });
      } else {
        setSearchError(`No alerts found for vehicle ${query}`);
        setSearchResults(null);
      }
    } catch (err) {
      console.error('Search error', err);
      setSearchError('Error performing search');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchRowNavigate = (alert) => {
    setSelectedAlert({ ...alert, isFromRepeated: false, hasAlert: alert.hasAlert });
    navigate(`/alerts/rs-category/${alert.category}/${alert.rsNo}/${alert.position}`, { state: { fromSearch: vehicleNo, origin: location.state?.origin || '' } });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            Vehicle Search Results
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Detailed list of alerts for vehicle: <span className="text-indigo-600 font-bold">{vehicleNo}</span>
          </p>
        </div>
      </div>

      {isSearching ? (
        <div className="flex flex-col justify-center items-center h-64 w-full gap-4 animate-fade-in-up">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-500/20"></div>
          <span className="font-bold tracking-widest uppercase text-sm text-indigo-600">Searching Vehicle Data...</span>
        </div>
      ) : searchError ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-600 rounded-3xl flex items-center gap-4 shadow-sm">
          <AlertCircle size={32} />
          <p className="font-medium text-lg">{searchError}</p>
        </div>
      ) : searchResults ? (
        <div className="relative group/search transition-all duration-500 animate-in fade-in zoom-in-95 slide-in-from-top-4">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-3xl blur opacity-20 transition duration-500"></div>
          <div className="relative bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center gap-3">
                <Search className="text-indigo-600" size={28} />
                RS Number: {searchResults.rsNo}
              </h3>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {searchResults.totalAlerts !== undefined && (
                  <div className="bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-4 shadow-inner">
                    <span>Alerts: <span className="text-red-500 text-lg">{searchResults.totalAlerts}</span></span>
                    <span className="w-px h-4 bg-indigo-300"></span>
                    <span>Normal: <span className="text-emerald-500 text-lg">{searchResults.totalNormal}</span></span>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/50 shadow-sm bg-white/50 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">S.No</th>
                    <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">RS Number</th>
                    <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Category</th>
                    <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Position</th>
                    <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Status</th>
                    <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {searchResults.alerts.map((alert, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleSearchRowNavigate(alert)}
                      className="group/row transition-all duration-300 relative hover:bg-white hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer z-0 hover:z-10"
                    >
                      <td className="py-4 px-6 text-sm font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-4 px-6 text-sm font-bold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-0 group-hover/row:opacity-100 transition-opacity"></div>
                          <span className="font-mono bg-white shadow-sm px-3 py-1.5 rounded-lg text-sm border border-slate-100 group-hover/row:border-indigo-200 transition-colors">{alert.rsNo}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">{alert.category}</span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span className="font-bold text-slate-600 flex items-center gap-2">
                          <span className="p-1.5 bg-slate-100 rounded-md text-xs">{alert.position}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {alert.hasAlert
                          ? <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">Alert</span>
                          : <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">Normal</span>
                        }
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-black shadow-sm ${alert.hasAlert ? (alert.times > 10 ? 'bg-red-100 text-red-700   border border-red-200 ' : 'bg-amber-100 text-amber-700   border border-amber-200 ') : 'bg-slate-100 text-slate-700   border border-slate-200 '}`}>
                          {alert.times} {alert.times === 1 ? 'time' : 'times'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
