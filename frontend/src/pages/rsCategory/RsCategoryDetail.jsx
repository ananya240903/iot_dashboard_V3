import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, Train, Search, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRsCategoryStore } from '../../store/useRsCategoryStore';

export default function RsCategoryDetail() {
  const { category } = useParams();
  const navigate = useNavigate();
  
  const { 
    repeatedAlerts, loading, error, 
    fetchCategoryData, setSelectedAlert 
  } = useRsCategoryStore();

  const [sortConfig, setSortConfig] = useState({ key: 'times', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const parentRef = useRef(null);

  // On mount, if store is empty, fetch the data
  useEffect(() => {
    fetchCategoryData();
  }, []);

  // Filter for the current category
  const categoryData = useMemo(() => {
    return repeatedAlerts.find(c => c.category === category)?.repeated_Alerts || [];
  }, [repeatedAlerts, category]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return categoryData;
    const lowerQ = searchQuery.toLowerCase();
    return categoryData.filter(item => String(item.rsNo).toLowerCase().includes(lowerQ));
  }, [categoryData, searchQuery]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(sortedData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    if (itemsPerPage === 'All') return sortedData;
    const startIndex = (page - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, page, itemsPerPage]);

  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 10,
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, itemsPerPage]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleRowNavigate = (alert) => {
    setSelectedAlert({ ...alert, isFromRepeated: true, hasAlert: true });
    navigate(`/alerts/rs-category/${category}/${alert.rsNo}/${alert.position}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full w-full gap-4 animate-fade-in-up mt-20">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-500/20"></div>
        <span className="font-bold tracking-widest uppercase text-sm text-indigo-600">Loading {category}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg m-6">
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-3" />
          <p className="text-red-700 font-medium">Error loading category: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto w-full h-full pb-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-2 shrink-0">
        <button 
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/alerts/rs-category');
            }
          }}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600 flex items-center gap-3">
            <Train size={32} className="text-indigo-600" />
            Category: {category}
          </h2>
        </div>
      </div>

      {/* ── Data Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-200/50 overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="p-6 border-b border-slate-100/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-linear-to-r from-slate-50/50 to-white/50 shrink-0">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <RefreshCw size={22} className="text-amber-500 animate-[spin_4s_linear_infinite]" />
            Alerts Based on RS Number and position ({sortedData.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search RS Number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl bg-white/70 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative min-h-0 bg-slate-50/30">
          <div ref={parentRef} className="absolute inset-0 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
              <thead className="bg-slate-100/95 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                <tr>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500 w-24">S.No</th>
                  <th 
                    className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleSort('rsNo')}
                  >
                    RS Number {sortConfig.key === 'rsNo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Category</th>
                  <th 
                    className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleSort('position')}
                  >
                    Position {sortConfig.key === 'position' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleSort('times')}
                  >
                    Alert Count {sortConfig.key === 'times' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr><td style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} colSpan="5" /></tr>
                )}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const alert = paginatedData[virtualRow.index];
                  if (!alert) return null;
                  const idx = itemsPerPage === 'All' ? virtualRow.index : (page - 1) * itemsPerPage + virtualRow.index;
                  
                  return (
                    <tr 
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      onClick={() => handleRowNavigate(alert)}
                      className="group/row transition-colors duration-200 relative hover:bg-white cursor-pointer"
                    >
                      <td className="py-4 px-6 text-sm font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-4 px-6 text-sm font-bold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-0 group-hover/row:opacity-100 transition-opacity"></div>
                          <span className="font-mono bg-white shadow-sm px-3 py-1.5 rounded-lg text-sm border border-slate-100">{alert.rsNo}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">{category}</span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span className="font-bold text-slate-600 bg-slate-100 p-1.5 rounded-md text-xs">{alert.position}</span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-black shadow-sm ${alert.times > 10 ? 'bg-red-100 text-red-700   border border-red-200 ' : 'bg-amber-100 text-amber-700   border border-amber-200 '}`}>
                          {alert.times} times
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr><td style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }} colSpan="5" /></tr>
                )}
                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500 font-medium">No alerts found for this category.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination Controls ────────────────────────────────────────────── */}
        {sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-200 shrink-0 gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500">
                Showing <span className="font-bold text-slate-700">{itemsPerPage === 'All' ? 1 : (page - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-700">{itemsPerPage === 'All' ? sortedData.length : Math.min(page * itemsPerPage, sortedData.length)}</span> of <span className="font-bold text-slate-700">{sortedData.length}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <label className="text-sm font-medium text-slate-500">Rows:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                  className="bg-white text-sm font-bold text-slate-700 rounded-lg border border-slate-200 outline-none cursor-pointer px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                  <option value="All">All</option>
                </select>
              </div>
            </div>
            {itemsPerPage !== 'All' && (
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="flex items-center justify-center px-4 py-2 text-sm font-bold text-slate-700 bg-white rounded-lg border border-slate-200">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
