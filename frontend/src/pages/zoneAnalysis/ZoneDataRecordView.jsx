import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Code, RefreshCw } from 'lucide-react';
import { fetchApi } from '../../utils/api';
import JsonToTable from '../../components/common/JsonToTable';

const renderHighlightedJSON = (dataObj) => {
    if (!dataObj) return null;
    const jsonStr = JSON.stringify(dataObj, null, 2);
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
    
    const parts = [];
    let lastIndex = 0;
    
    let match;
    while ((match = regex.exec(jsonStr)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={`text-${lastIndex}`}>{jsonStr.substring(lastIndex, match.index)}</span>);
        }
        
        let cls = 'text-[#b5cea8]'; // number
        if (/^"/.test(match[0])) {
            if (/:$/.test(match[0])) {
                cls = 'text-[#9cdcfe]'; // key
            } else {
                cls = 'text-[#ce9178]'; // string
            }
        } else if (/true|false/.test(match[0])) {
            cls = 'text-[#569cd6]'; // boolean
        } else if (/null/.test(match[0])) {
            cls = 'text-[#569cd6]'; // null
        }
        
        parts.push(<span key={`match-${match.index}`} className={cls}>{match[0]}</span>);
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < jsonStr.length) {
        parts.push(<span key={`text-${lastIndex}`}>{jsonStr.substring(lastIndex)}</span>);
    }
    
    return parts;
};

export default function ZoneDataRecordView() {
    const { dataId } = useParams();
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'raw'
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRecord = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetchApi(`/Deviceinformation/data/${dataId}`);
                if (res.success && res.data) {
                    setData(res.data);
                } else if (res && typeof res === 'object' && Object.keys(res).length > 0) {
                    setData(res);
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
        if (dataId) fetchRecord();
    }, [dataId]);

    const readingTime = data?.reading_timestamp
        ? new Date(data.reading_timestamp).toLocaleString('en-GB')
        : null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-full h-full pb-6">
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
                            {data?.has_alert && (
                                <span className="text-xs font-black bg-red-100 text-red-700 px-3 py-1 rounded-lg">
                                    Alert
                                </span>
                            )}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-slate-500">
                            {data?.deviceDetails?.device_type_name && (
                                <><span>{data.deviceDetails.device_type_name}</span><span className="text-slate-300">·</span></>
                            )}
                            {data?.device_id && (
                                <><span>Device ID: <strong className="text-slate-700">{data.device_id}</strong></span><span className="text-slate-300">·</span></>
                            )}
                            {data?.zone && (
                                <><span>Zone: <strong className="text-slate-700">{data.zone}</strong></span><span className="text-slate-300">·</span></>
                            )}
                            {readingTime && <span>{readingTime}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 shadow-inner shrink-0">
                    <button
                        onClick={() => setViewMode('formatted')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                            viewMode === 'formatted'
                                ? 'bg-indigo-500 text-white shadow-md'
                                : 'text-slate-500  hover:text-slate-700 '
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        Formatted
                    </button>
                    <button
                        onClick={() => setViewMode('raw')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                            viewMode === 'raw'
                                ? 'bg-slate-700 text-green-400 shadow-md'
                                : 'text-slate-500  hover:text-slate-700 '
                        }`}
                    >
                        <Code size={15} />
                        Raw JSON
                    </button>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
                <div className={`h-1.5 w-full transition-all duration-300 ${
                    viewMode === 'formatted'
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        : 'bg-gradient-to-r from-slate-700 to-slate-900  '
                }`} />

                {loading ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-slate-500 py-20">
                        <RefreshCw className="animate-spin text-indigo-500" size={32} />
                        <span className="font-semibold text-lg">Loading record data...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-red-500 bg-red-50 py-20 m-6 rounded-2xl border border-red-100">
                        <span className="font-bold text-lg">{error}</span>
                    </div>
                ) : data ? (
                    <div className="p-6 flex-1 overflow-auto max-h-[70vh]">
                        {viewMode === 'formatted' ? (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-in fade-in duration-300">
                                <JsonToTable data={data} />
                            </div>
                        ) : (
                            <div className="relative group animate-in fade-in duration-300 h-full">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shadow-lg"
                                        title="Copy JSON"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    </button>
                                </div>
                                <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-2xl overflow-auto text-sm font-mono shadow-inner border border-slate-800 max-h-[65vh]">
                                    <code className="block">
                                        {renderHighlightedJSON(data)}
                                    </code>
                                </pre>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
