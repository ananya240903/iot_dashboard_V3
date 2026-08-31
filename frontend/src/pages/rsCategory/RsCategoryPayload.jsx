import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowLeft, RefreshCw, X, Code, Play, Train, AlertCircle, TrendingUp, Search } from 'lucide-react';
import { useRsCategoryStore } from '../../store/useRsCategoryStore';
import { useAlertDetailsModal } from '../../hooks/useAlertDetailsModal';
import { useTrendData } from '../../hooks/useTrendData';
import TrendChartsSection from '../../components/common/TrendChartsSection';


export default function RsCategoryPayload() {
  const { category, rsNo, position } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleBackNavigation = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      const fromSearch = location.state?.fromSearch;
      if (fromSearch) {
        navigate(`/alerts/vehicle/${fromSearch}`, { state: { origin: location.state?.origin } });
      } else {
        navigate(`/alerts/rs-category/${category}`);
      }
    }
  };

  const { selectedAlert, fetchAlertByRsPos } = useRsCategoryStore();
  const {
    selectedRowAlerts,
    isFetchingRowData,
    showTrendAnalysis,
    setShowTrendAnalysis,
    isTrendFullScreen,
    setIsTrendFullScreen,
    showAnalysisMenu,
    setShowAnalysisMenu,
    tablePage,
    setTablePage,
    handleRowClick,
    handleFullDetailedAnalysis,
  } = useAlertDetailsModal();

  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [initLoading, setInitLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('table');
  const parentRef = useRef(null);

  // Load the initial data when the page loads
  useEffect(() => {
    async function loadData() {
      setInitLoading(true);
      let alertData = selectedAlert;
      
      if (!alertData) {
        // Fallback: fetch from API if store has no data (e.g. direct URL hit)
        alertData = await fetchAlertByRsPos(rsNo, position);
      }

      if (alertData) {
        await handleRowClick(alertData);
      }
      setInitLoading(false);
    }
    loadData();
  }, [rsNo, position, selectedAlert]); // Note: handleRowClick is from custom hook, typically stable

  // Data preparation for pagination & virtualization
  const paginatedData = useMemo(() => {
    if (!selectedRowAlerts?.data) return [];
    if (itemsPerPage === 'All') return selectedRowAlerts.data;
    const startIndex = (tablePage - 1) * itemsPerPage;
    return selectedRowAlerts.data.slice(startIndex, startIndex + itemsPerPage);
  }, [selectedRowAlerts, tablePage, itemsPerPage]);

  const totalPages = selectedRowAlerts ? (itemsPerPage === 'All' ? 1 : Math.ceil(selectedRowAlerts.data.length / itemsPerPage)) : 1;

  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  const { groupedTrendData, schemaNumericKeys, hasTrendData } = useTrendData(selectedRowAlerts, true);
  const [isolatedSeries, setIsolatedSeries] = useState(null);
  const hoveredSeriesRef = useRef({});

  if (initLoading || isFetchingRowData) {
    return (
      <div className="flex flex-col justify-center items-center h-full w-full gap-4 animate-fade-in-up mt-20">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-500/20"></div>
        <span className="font-bold tracking-widest uppercase text-sm text-indigo-600">Loading Payload Data...</span>
      </div>
    );
  }

  if (!selectedRowAlerts) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Alert Not Found</h2>
        <p className="text-slate-500 mt-2">Could not load details for RS Number {rsNo} at position {position}</p>
        <button 
          onClick={handleBackNavigation}
          className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-full h-full pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-2 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm px-6 py-4 relative z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackNavigation}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Train className="text-indigo-600" />
              RS Number: <span className="text-indigo-600">{rsNo}</span>
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-500 text-sm font-medium">Category: <span className="text-indigo-500 font-bold">{category}</span></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-slate-500 text-sm font-medium">Position: <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">{position}</span></span>
              {selectedRowAlerts.hasAlert && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle size={12} /> Alert Present
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {!showTrendAnalysis && (
            <div className="relative">
              <button
                onClick={() => setShowAnalysisMenu(!showAnalysisMenu)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full justify-center"
              >
                <TrendingUp size={18} /> Deep Trend Analysis
              </button>
              
              {showAnalysisMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-200 z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Analysis Scope</p>
                    <p className="text-xs text-slate-400">Historical trend mapping across data points</p>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    <button onClick={() => { handleFullDetailedAnalysis('wheel'); setActiveTab('chart'); }} className="flex flex-col text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors">
                      <span className="text-sm font-bold text-slate-700">Single Wheel Position</span>
                      <span className="text-xs text-slate-500 mt-1">Trend analysis for {selectedRowAlerts.position} only</span>
                    </button>
                    <button onClick={() => { handleFullDetailedAnalysis('axle'); setActiveTab('chart'); }} className="flex flex-col text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors">
                      <span className="text-sm font-bold text-slate-700">Full Axle View</span>
                      <span className="text-xs text-slate-500 mt-1">Compare L & R positions for this axle</span>
                    </button>
                    <button onClick={() => { handleFullDetailedAnalysis('rs'); setActiveTab('chart'); }} className="flex flex-col text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors border border-indigo-100 bg-indigo-50/50">
                      <span className="text-sm font-bold text-indigo-700">Complete Rolling Stock</span>
                      <span className="text-xs text-indigo-600/70 mt-1">Comprehensive mapping of all positions</span>
                    </button>
                  </div>
                  <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <button onClick={() => setShowAnalysisMenu(false)} className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showTrendAnalysis && (
            <button
              onClick={() => {
                setShowTrendAnalysis(false);
                setActiveTab('table');
                if (selectedRowAlerts.originalData) {
                  const originalDataIds = new Set(selectedRowAlerts.originalData.map(d => d.data_id));
                  setTablePage(1);
                  handleRowClick({
                    ...selectedRowAlerts,
                    isFromRepeated: true,
                    data_id: Array.from(originalDataIds)
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-semibold border border-slate-200"
            >
              <X size={16} /> Close Analysis
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      {showTrendAnalysis && hasTrendData && (
        <div className="flex bg-white/70 p-1.5 rounded-xl backdrop-blur-md border border-slate-200 w-fit shrink-0 -mt-2 z-40 relative">
          <button 
            onClick={() => setActiveTab('table')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'table' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600  hover:bg-slate-100 '}`}
          >
            Alert Data
          </button>
          <button 
            onClick={() => setActiveTab('chart')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chart' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600  hover:bg-slate-100 '}`}
          >
            Trend Analysis
          </button>
        </div>
      )}

      {/* ── Trend Analysis Panel ────────────────────────────────────────────── */}
      {showTrendAnalysis && hasTrendData && activeTab === 'chart' && (
        <div className={`transition-all duration-500 ease-in-out ${isTrendFullScreen ? 'fixed inset-4 z-50 bg-white/90  backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200  flex flex-col p-6' : 'bg-white/70  backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/50  p-6 flex-1 flex flex-col min-h-0'}`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <TrendingUp className="text-indigo-500" />
                {selectedRowAlerts.analysisType === 'wheel' ? 'Wheel Position Trend' : selectedRowAlerts.analysisType === 'axle' ? 'Axle Performance Trend' : 'Complete RS Trend Analysis'}
              </h3>
              <p className="text-sm text-slate-500 mt-1 font-medium">Historical data timeline across multiple readings</p>
            </div>
            <div className="flex gap-3 items-center">
              {!selectedRowAlerts.hasFetchedAllData && (
                <button
                  onClick={() => handleFullDetailedAnalysis(selectedRowAlerts.analysisType, true)}
                  className="px-4 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Fetch All Historical Data
                </button>
              )}
              <button
                onClick={() => setIsTrendFullScreen(!isTrendFullScreen)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                {isTrendFullScreen ? <><X size={16} /> Exit Fullscreen</> : <><Search size={16} /> Maximize Chart</>}
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full border border-slate-200/50 rounded-2xl bg-white/50 overflow-hidden relative flex flex-col custom-scrollbar overflow-y-auto">
            <TrendChartsSection
              groupedTrendData={groupedTrendData}
              schemaNumericKeys={schemaNumericKeys}
              selectedRowAlerts={selectedRowAlerts}
              isTrendFullScreen={isTrendFullScreen}
              isolatedSeries={isolatedSeries || {}}
              setIsolatedSeries={setIsolatedSeries}
              hoveredSeriesRef={hoveredSeriesRef}
            />
          </div>
        </div>
      )}

      {/* ── Data Table ──────────────────────────────────────────── */}
      {(!showTrendAnalysis || !hasTrendData || activeTab === 'table') && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-200/50 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-6 border-b border-slate-100/50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white/50">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <Play className="text-indigo-500 fill-indigo-500" size={18} />
            Alert Data
          </h3>
          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
            {selectedRowAlerts.data.length} records
          </span>
        </div>

        <div className="flex-1 overflow-hidden relative group/table">
            <div 
              ref={parentRef} 
              className="absolute inset-0 overflow-auto custom-scrollbar bg-white/30"
            >
              <table className="w-full text-left border-collapse min-w-[1200px] relative z-0">
                <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md shadow-sm">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap w-12 text-center">#</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Data ID</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Device ID</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Device Type</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Vendor</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Reading Time</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Site</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Station</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">Section</th>
                    <th className="py-3 px-6 font-semibold text-sm text-slate-600 whitespace-nowrap">Position</th>
                    <th className="py-3 px-6 font-semibold text-sm text-slate-600 whitespace-nowrap">Device Data</th>
                    <th className="py-3 px-6 font-semibold text-sm text-slate-600 whitespace-nowrap">Status</th>
                    <th className="py-3 px-6 font-semibold text-sm text-slate-600 whitespace-nowrap">Alert Description</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-500 whitespace-nowrap text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr><td style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} colSpan="15" /></tr>
                  )}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = paginatedData[virtualRow.index];
                    if (!item) return null;
                    const absoluteIdx = itemsPerPage === 'All' ? virtualRow.index : (tablePage - 1) * itemsPerPage + virtualRow.index;
                    
                    return (
                      <tr
                        key={virtualRow.key}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        onClick={() => navigate(`/alerts/rs-category/${category}/${rsNo}/${position}/${item.data_id}`, { state: { itemData: item.fullJson || item, fromPayload: true } })}
                        className={`hover:bg-indigo-50/60  transition-colors align-top cursor-pointer ${item.hasAlert ? 'bg-red-50/20 ' : ''}`}
                      >
                        <td className="py-4 px-4 text-sm font-semibold text-slate-500 text-center border-r border-slate-100">
                          {absoluteIdx + 1}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">{item.data_id}</span>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{item.device_id}</span>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {item.deviceDetails ? <span className="font-medium text-slate-700">{item.deviceDetails.device_type_name || '-'}</span> : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {item.deviceDetails ? <span className="font-medium text-slate-700">{item.deviceDetails.vendor_name || '-'}</span> : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600 whitespace-nowrap">
                          {item.reading_timestamp ? new Date(item.reading_timestamp).toLocaleString('en-GB') : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {item.deviceDetails?.site || '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {item.deviceDetails?.station_code || '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {item.deviceDetails?.section || '-'}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          {item.wheelJson?.position ? (
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{item.wheelJson.position}</span>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          {item.wheelJson && item.wheelJson.deviceData ? (
                            <div className="max-h-32 max-w-[200px] overflow-auto bg-slate-50 p-2 rounded-md text-[10px] leading-tight font-mono text-slate-600 custom-scrollbar border border-slate-200">
                              <pre>{JSON.stringify(item.wheelJson.deviceData, null, 2)}</pre>
                            </div>
                          ) : <span className="text-slate-400 italic">N/A</span>}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          {item.wheelJson?.status ? (
                            typeof item.wheelJson.status === 'object' ? (
                              <div className="max-h-32 max-w-[200px] overflow-auto bg-slate-50 p-2 rounded-md text-[10px] leading-tight font-mono text-slate-600 custom-scrollbar border border-slate-200">
                                <pre>{JSON.stringify(item.wheelJson.status, null, 2)}</pre>
                              </div>
                            ) : (
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium max-w-[150px] whitespace-normal ${String(item.wheelJson.status).toLowerCase() === 'maint' ? 'bg-amber-100 text-amber-800  ' : 'bg-slate-100 text-slate-800  '}`}>
                                {item.wheelJson.status}
                              </span>
                            )
                          ) : '-'}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 max-w-[200px] break-words">
                          {item.wheelJson?.alertDescription ? (
                            <span className={item.hasAlert ? 'text-red-600  font-medium' : ''}>
                              {item.wheelJson.alertDescription}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-center">
                          <span className="text-xs text-indigo-500 font-semibold bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1 justify-center whitespace-nowrap">
                            <Code size={11} /> View
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr><td style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }} colSpan="15" /></tr>
                  )}
                  {selectedRowAlerts.data.length === 0 && (
                    <tr>
                      <td colSpan="15" className="py-12 text-center text-slate-500">Failed to load data segments or no data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        {/* Pagination controls */}
        {selectedRowAlerts.data.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500">
                Showing <span className="font-bold text-slate-700">{itemsPerPage === 'All' ? 1 : (tablePage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-700">{itemsPerPage === 'All' ? selectedRowAlerts.data.length : Math.min(tablePage * itemsPerPage, selectedRowAlerts.data.length)}</span> of <span className="font-bold text-slate-700">{selectedRowAlerts.data.length}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <label className="text-sm font-medium text-slate-500">Rows:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value));
                    setTablePage(1);
                  }}
                  className="bg-white text-sm font-bold text-slate-700 rounded border border-slate-200 outline-none cursor-pointer px-2 py-1"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value="All">All</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                disabled={tablePage === 1}
                onClick={() => setTablePage(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={tablePage === totalPages}
                onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
