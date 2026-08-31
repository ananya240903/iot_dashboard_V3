import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Code, AlertCircle, Train, RefreshCw } from 'lucide-react';
import { fetchApi } from '../../utils/api';
import JsonToTable from '../../components/common/JsonToTable';

export default function RsCategoryDataView() {
  const { category, rsNo, position, dataId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('rs');
  const [fullViewMode, setFullViewMode] = useState('formatted'); // for Full JSON sub-toggle
  const [rsViewMode, setRsViewMode] = useState('formatted');    // for RS JSON sub-toggle

  // Full API data (fetched on mount)
  const [fullData, setFullData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metadata from navigation state (for header, available instantly)
  const stateItem = location.state?.itemData;

  useEffect(() => {
    const fetchFullData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchApi(`/Deviceinformation/data/${dataId}`);
        if (res.success && res.data) {
          setFullData(res.data);
        } else if (res && typeof res === 'object') {
          setFullData(res);
        } else {
          setError('Could not load data for this record.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };
    fetchFullData();
  }, [dataId]);

  // Extract the RS-specific entry from payload.rsDetails matching rsNo
  const rsJsonData = React.useMemo(() => {
    if (!fullData) return null;
    const rsDetails = fullData?.payload?.rsDetails;
    if (Array.isArray(rsDetails)) {
      return rsDetails.find(rs => String(rs.no) === String(rsNo)) ?? rsDetails[0] ?? null;
    }
    // Fallback: use wheelJson from navigation state
    return stateItem?.wheelJson ?? null;
  }, [fullData, rsNo, stateItem]);

  // Header metadata — prefer stateItem (instant), fallback to fullData
  const readingTime = fullData?.reading_timestamp
    ? new Date(fullData.reading_timestamp).toLocaleString('en-GB')
    : stateItem?.reading_timestamp
      ? new Date(stateItem.reading_timestamp).toLocaleString('en-GB')
      : null;
  const deviceType = fullData?.deviceDetails?.device_type_name ?? stateItem?.deviceDetails?.device_type_name;
  const vendor = fullData?.deviceDetails?.vendor_name ?? stateItem?.deviceDetails?.vendor_name;
  const hasAlert = stateItem?.hasAlert;
  const alertDescription = stateItem?.wheelJson?.alertDescription;
  const statusVal = stateItem?.wheelJson?.status;
  const statusStr = statusVal ? String(statusVal).toLowerCase() : '';

  // ── Shared sub-toggle component ────────────────────────────────────
  const ViewSubToggle = ({ value, onChange }) => (
    <div className="flex bg-white p-1 rounded-xl gap-1 border border-slate-200 shadow-sm">
      <button
        onClick={() => onChange('formatted')}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          value === 'formatted'
            ? 'bg-indigo-500 text-white shadow'
            : 'text-slate-500  hover:text-slate-700 '
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        Formatted
      </button>
      <button
        onClick={() => onChange('raw')}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          value === 'raw'
            ? 'bg-slate-700 text-green-400 shadow'
            : 'text-slate-500  hover:text-slate-700 '
        }`}
      >
        <Code size={12} />
        Raw JSON
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-full h-full pb-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 flex-wrap">
              <Code className="text-indigo-600 shrink-0" />
              Data Record
              <span className="font-mono text-base font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg">
                ID: {dataId}
              </span>
              {hasAlert && (
                <span className="text-xs font-black bg-red-100 text-red-700 px-3 py-1 rounded-lg flex items-center gap-1">
                  <AlertCircle size={12} /> Alert
                </span>
              )}
              {statusVal && (
                <span 
                  className={`text-xs font-bold px-3 py-1 rounded-lg ${
                    statusStr === 'maint' ? 'bg-amber-100 text-amber-700  '
                    : statusStr === 'good' ? 'bg-emerald-100 text-emerald-700  '
                    : 'bg-slate-100 text-slate-700  '
                  }`}
                  title={typeof statusVal === 'object' ? JSON.stringify(statusVal) : ''}
                >
                  {typeof statusVal === 'object' ? 'Complex Status' : statusVal}
                </span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Train size={13} />
                <span>RS: <strong className="text-indigo-600">{rsNo}</strong></span>
              </div>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">Category: <strong className="text-slate-700">{category}</strong></span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">Position: <strong className="text-slate-700">{position}</strong></span>
              {deviceType && <><span className="text-slate-300">·</span><span className="text-sm text-slate-500">{deviceType}</span></>}
              {vendor && <><span className="text-slate-300">·</span><span className="text-sm text-slate-500">{vendor}</span></>}
              {readingTime && <><span className="text-slate-300">·</span><span className="text-sm text-slate-400">{readingTime}</span></>}
            </div>
            {alertDescription && (
              <p className="mt-2 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 inline-block">
                ⚠ {alertDescription}
              </p>
            )}
          </div>
        </div>

        {/* Main Tab Toggle */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 shadow-inner self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('rs')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'rs'
                ? 'bg-white  text-indigo-600  shadow-md'
                : 'text-slate-500  hover:text-slate-700 '
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            RS JSON
          </button>
          <button
            onClick={() => setActiveTab('full')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'full'
                ? 'bg-white  text-emerald-600  shadow-md'
                : 'text-slate-500  hover:text-slate-700 '
            }`}
          >
            <Code size={15} />
            Full JSON
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Colored tab indicator strip */}
        <div className={`h-1.5 w-full transition-all duration-300 ${
          activeTab === 'rs'
            ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
            : 'bg-gradient-to-r from-emerald-400 to-teal-500'
        }`} />

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-slate-500 py-20">
            <RefreshCw className="animate-spin text-indigo-500" size={36} />
            <p className="font-medium">Loading record for Data ID: {dataId}...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-500 py-20">
            <AlertCircle size={36} className="text-red-400" />
            <p className="font-medium text-red-600">{error}</p>
            <button onClick={() => navigate(-1)} className="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors text-sm">
              Go Back
            </button>
          </div>
        ) : activeTab === 'rs' ? (
          /* ─── RS JSON Tab ───────────────────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/50 bg-slate-50/60">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                RS #{rsNo} — Payload Entry from rsDetails
              </span>
              <ViewSubToggle value={rsViewMode} onChange={setRsViewMode} />
            </div>
            {rsJsonData ? (
              rsViewMode === 'formatted' ? (
                <div className="flex-1 overflow-auto custom-scrollbar p-8">
                  <JsonToTable data={rsJsonData} />
                </div>
              ) : (
                <div className="flex-1 overflow-auto custom-scrollbar p-8 bg-slate-950">
                  <pre className="text-sm text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {JSON.stringify(rsJsonData, null, 2)}
                  </pre>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-400 py-20">
                <AlertCircle size={32} className="text-amber-400" />
                <p className="text-sm font-medium">RS-specific payload not found in rsDetails for RS #{rsNo}</p>
              </div>
            )}
          </div>
        ) : (
          /* ─── Full JSON Tab ─────────────────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/50 bg-slate-50/60">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Full Record — Data ID: {dataId}
              </span>
              <ViewSubToggle value={fullViewMode} onChange={setFullViewMode} />
            </div>
            {fullViewMode === 'formatted' ? (
              <div className="flex-1 overflow-auto custom-scrollbar p-8">
                <JsonToTable data={fullData} />
              </div>
            ) : (
              <div className="flex-1 overflow-auto custom-scrollbar p-8 bg-slate-950">
                <pre className="text-sm text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {JSON.stringify(fullData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
