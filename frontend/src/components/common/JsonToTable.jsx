import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const JsonToTable = ({ data }) => {
    if (data === null || data === undefined) return <span className="text-slate-400 italic">null</span>;
    
    if (typeof data !== 'object') {
        if (typeof data === 'boolean') {
            return <span className={`font-bold ${data ? 'text-red-600 ' : 'text-emerald-600 '}`}>{String(data)}</span>;
        }
        if (typeof data === 'number') {
            return <span className="font-bold text-blue-600">{data}</span>;
        }
        if (typeof data === 'string') {
            if (data.startsWith('http://') || data.startsWith('https://')) {
                return <a href={data} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all font-medium">{data}</a>;
            }
            if (data.toLowerCase() === 'good') {
                return (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <CheckCircle2 size={14} />
                        {data}
                    </span>
                );
            }
            
            const dateRegex = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
            if (dateRegex.test(data)) {
                const dateToParse = data.replace(' ', 'T');
                const d = new Date(dateToParse);
                if (!isNaN(d.getTime())) {
                    return <span className="text-slate-700 font-medium">{d.toLocaleString()}</span>;
                }
            }

            return <span className="text-slate-700 font-medium">{data}</span>;
        }
        return <span className="text-slate-800 font-medium">{String(data)}</span>;
    }
    
    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-slate-400 italic">Empty Array []</span>;
        
        // If array of primitives
        if (typeof data[0] !== 'object' || data[0] === null) {
            return (
                <div className="flex flex-wrap gap-2">
                    {data.map((d, i) => (
                        <span key={i} className="bg-slate-100 px-2 py-1 rounded border border-slate-200 shadow-sm inline-block">
                            <JsonToTable data={d} />
                        </span>
                    ))}
                </div>
            );
        }
        
        // Array of objects
        const keys = Array.from(new Set(data.flatMap(item => Object.keys(item)))).filter(k => k !== 'success' && k !== 'source');
        if (keys.length === 0) return <span className="text-slate-400 italic">Empty Objects [{}]</span>;
        return (
            <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-sm">
                <table className="min-w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100/80">
                        <tr>
                            {keys.map(k => (
                                <th key={k} className="px-3 py-2 border-b border-r border-slate-300 font-bold text-indigo-800 last:border-r-0 whitespace-nowrap bg-indigo-50/30">
                                    {k}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                {keys.map(k => (
                                    <td key={k} className="px-3 py-2 border-r border-slate-300 last:border-r-0 align-top">
                                        <JsonToTable data={row[k]} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    
    // It's an object
    const keys = Object.keys(data).filter(k => k !== 'success' && k !== 'source');
    if (keys.length === 0) return <span className="text-slate-400 italic">Empty Object {'{}'}</span>;
    
    return (
        <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
                <tbody className="divide-y divide-slate-200">
                    {keys.map(k => (
                        <tr key={k} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 font-bold text-indigo-800 align-top w-48 border-r border-slate-200 whitespace-nowrap bg-slate-50/50">
                                {k}
                            </td>
                            <td className="px-3 py-2 align-top overflow-x-auto">
                                <JsonToTable data={data[k]} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default JsonToTable;
