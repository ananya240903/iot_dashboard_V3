import React, { useState, useEffect } from 'react';
import { Code, X, RefreshCw } from 'lucide-react';
import { fetchApi } from '../../utils/api';
import JsonToTable from './JsonToTable';

const DataViewerModal = ({ isOpen, onClose, dataId }) => {
    const [viewDataMode, setViewDataMode] = useState('formatted');
    const [viewDataContent, setViewDataContent] = useState(null);
    const [viewDataLoading, setViewDataLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen || !dataId) return;
            
            setViewDataLoading(true);
            setViewDataContent(null);
            try {
                const res = await fetchApi(`/Deviceinformation/data/${dataId}`);
                if (res.success && res.data) {
                    setViewDataContent(res.data);
                } else {
                    setViewDataContent(res);
                }
            } catch (err) {
                console.error(err);
                setViewDataContent({ error: 'Failed to fetch data' });
            } finally {
                setViewDataLoading(false);
            }
        };

        fetchData();
    }, [isOpen, dataId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Code className="text-indigo-500" />
                        Data (ID: {dataId})
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewDataMode('formatted')}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewDataMode === 'formatted' ? 'bg-white  text-indigo-600  shadow-sm' : 'text-slate-500  hover:text-slate-700 '}`}
                            >
                                Formatted
                            </button>
                            <button
                                onClick={() => setViewDataMode('raw')}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewDataMode === 'raw' ? 'bg-white  text-indigo-600  shadow-sm' : 'text-slate-500  hover:text-slate-700 '}`}
                            >
                                Raw JSON
                            </button>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className={`p-6 overflow-auto custom-scrollbar flex-1 ${viewDataMode === 'raw' ? 'bg-slate-50 ' : 'bg-white '}`}>
                    {viewDataLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-4 text-slate-500">
                            <RefreshCw className="animate-spin text-indigo-500" size={32} />
                            <p className="font-medium">Fetching Data...</p>
                        </div>
                    ) : viewDataMode === 'raw' ? (
                        <pre className="text-sm font-mono text-slate-800 whitespace-pre-wrap">
                            {JSON.stringify(viewDataContent, null, 2)}
                        </pre>
                    ) : (
                        <div className="w-full">
                            <JsonToTable data={viewDataContent} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataViewerModal;
