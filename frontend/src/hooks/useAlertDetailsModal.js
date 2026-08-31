import { useState } from 'react';
import { fetchApi } from '../utils/api';

export function useAlertDetailsModal() {
  const [selectedRowAlerts, setSelectedRowAlerts] = useState(null);
  const [isFetchingRowData, setIsFetchingRowData] = useState(false);
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);
  const [isTrendFullScreen, setIsTrendFullScreen] = useState(false);
  const [showAnalysisMenu, setShowAnalysisMenu] = useState(false);
  const [expandedJson, setExpandedJson] = useState(null);
  const [tablePage, setTablePage] = useState(1);

  const fetchAlertRowData = async (alertRow) => {
    let idsToFetch;
    if (alertRow.isFromRepeated) {
      idsToFetch = Array.isArray(alertRow.data_id) ? alertRow.data_id : [alertRow.data_id];
    } else {
      idsToFetch = alertRow.data_ids || (Array.isArray(alertRow.data_id) ? alertRow.data_id : [alertRow.data_id]);
    }

    if (idsToFetch.length === 0) return [];

    const bulkRes = await fetchApi('/Deviceinformation/data/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data_ids: idsToFetch,
        rsNo: alertRow.rsNo,
        position: alertRow.position === "ALL" ? "" : alertRow.position
      })
    });

    let results = [];
    if (bulkRes.success && bulkRes.data) {
      results = bulkRes.data.map(data => {
        return {
          data_id: data.data_id,
          device_id: data.device_id || 'Unknown',
          reading_timestamp: data.reading_timestamp,
          wheelJson: data.wheelJson || { error: 'Wheel JSON not found' },
          deviceDetails: data.deviceDetails || null,
          hasAlert: alertRow.hasAlert
        };
      });
    }

    return results;
  };

  const handleViewJson = async (item, type) => {
    try {
      const res = await fetchApi(`/Deviceinformation/data/${item.data_id}`);
      if (res.success && res.data) {
        const fullData = res.data;
        if (type === 'full') {
          setExpandedJson(fullData);
        } else if (type === 'rs') {
          let alertJson = null;
          if (fullData.payload) {
            if (fullData.payload.rsDetails && Array.isArray(fullData.payload.rsDetails)) {
              alertJson = fullData.payload.rsDetails.filter(rs =>
                String(rs.rsNo) === String(selectedRowAlerts.rsNo) ||
                String(rs.no) === String(selectedRowAlerts.rsNo) ||
                String(rs.rsno) === String(selectedRowAlerts.rsNo)
              );
              if (alertJson.length === 0) alertJson = null;
            }
            if (!alertJson && fullData.payload.rollingStock && Array.isArray(fullData.payload.rollingStock)) {
              alertJson = fullData.payload.rollingStock.filter(rs =>
                String(rs.vehicleNo) === String(selectedRowAlerts.rsNo)
              );
              if (alertJson.length === 0) alertJson = null;
            }
          }
          setExpandedJson(alertJson || { error: 'RS JSON not found' });
        }
      } else {
        setExpandedJson({ error: 'Failed to fetch data' });
      }
    } catch (e) {
      console.error(e);
      setExpandedJson({ error: 'Exception fetching data' });
    }
  };

  const handleRowClick = async (alertRow) => {
    if (!alertRow.data_id || alertRow.data_id.length === 0) return;

    setIsFetchingRowData(true);
    setTablePage(1);
    try {
      const data = await fetchAlertRowData(alertRow);

      setSelectedRowAlerts({
        rsNo: alertRow.rsNo,
        position: alertRow.position,
        hasAlert: alertRow.hasAlert,
        isFromRepeated: alertRow.isFromRepeated,
        isFullDetailed: false,
        data: data.sort((a, b) => new Date(b.reading_timestamp) - new Date(a.reading_timestamp))
      });
    } catch (err) {
      console.error("Error fetching row data:", err);
    } finally {
      setIsFetchingRowData(false);
    }
  };

  const handleFullDetailedAnalysis = async (type, fetchAll = false) => {
    if (!selectedRowAlerts) return;
    setIsFetchingRowData(true);
    setShowAnalysisMenu(false);
    setTablePage(1);
    try {
      const res = await fetchApi(`/RsCategory/alerts/search/${selectedRowAlerts.rsNo}`);
      if (res.success && res.data && res.data.length > 0) {
        let positionsToFetch = [];

        if (type === 'wheel') {
          positionsToFetch = [selectedRowAlerts.position];
        } else if (type === 'axle') {
          const pos = selectedRowAlerts.position;
          if (pos.startsWith('L')) positionsToFetch = [pos, 'R' + pos.substring(1)];
          else if (pos.startsWith('R')) positionsToFetch = [pos, 'L' + pos.substring(1)];
          else positionsToFetch = [pos];
        } else if (type === 'rs') {
          positionsToFetch = res.data.map(a => a.position).filter((v, i, a) => a.indexOf(v) === i);
        }

        let dataIdsToFetch = new Set();
        if (selectedRowAlerts.data) {
          selectedRowAlerts.data.forEach(item => {
            if (item.data_id) dataIdsToFetch.add(String(item.data_id));
          });
        }
        if (res.totalDataIds && Array.isArray(res.totalDataIds)) {
          res.totalDataIds.forEach(id => dataIdsToFetch.add(String(id)));
        }
        for (const p of positionsToFetch) {
          const rowsForPos = res.data.filter(a => a.position === p);
          for (const row of rowsForPos) {
            const dataIds = row.data_id || row.data_ids || [];
            dataIds.forEach(id => dataIdsToFetch.add(String(id)));
          }
        }
        const sortedIds = Array.from(dataIdsToFetch).sort((a, b) => parseInt(a) - parseInt(b));
        const uniqueDataIds = fetchAll ? sortedIds : sortedIds.slice(-50);

        let allNewData = [];
        if (uniqueDataIds.length > 0) {
          const trendRes = await fetchApi('/Analysis/trend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data_ids: uniqueDataIds,
              rsNo: selectedRowAlerts.rsNo,
              type: type,
              position: selectedRowAlerts.position
            })
          });

          if (trendRes.success && trendRes.data) {
            const alertDataIdsByPos = {};
            res.data.filter(a => a.hasAlert === true).forEach(row => {
              if (!alertDataIdsByPos[row.position]) alertDataIdsByPos[row.position] = new Set();
              const ids = row.data_id || row.data_ids || [];
              ids.forEach(id => alertDataIdsByPos[row.position].add(String(id)));
            });

            allNewData = trendRes.data.map(item => {
              const pos = item.wheelJson?.position || 'Unknown';
              const alertSet = alertDataIdsByPos[pos];
              return {
                ...item,
                hasAlert: alertSet ? alertSet.has(String(item.data_id)) : false
              };
            });
          }
        }

        const uniqueDataMap = new Map();
        allNewData.forEach(item => {
          const key = item.data_id + '_' + (item.wheelJson?.position || '');
          uniqueDataMap.set(key, item);
        });
        const uniqueData = Array.from(uniqueDataMap.values());

        setSelectedRowAlerts(prev => ({
          ...prev,
          isFullDetailed: true,
          analysisType: type,
          hasFetchedAllData: fetchAll,
          originalData: prev.originalData || prev.data,
          data: uniqueData.sort((a, b) => new Date(b.reading_timestamp) - new Date(a.reading_timestamp))
        }));
        setShowTrendAnalysis(true);
      } else {
        setSelectedRowAlerts(prev => ({ ...prev, isFullDetailed: true, analysisType: type, hasFetchedAllData: fetchAll, originalData: prev.originalData ? prev.originalData : prev.data }));
        setShowTrendAnalysis(true);
      }
    } catch (err) {
      console.error("Error during full analysis fetch:", err);
    } finally {
      setIsFetchingRowData(false);
    }
  };

  return {
    selectedRowAlerts,
    setSelectedRowAlerts,
    isFetchingRowData,
    showTrendAnalysis,
    setShowTrendAnalysis,
    isTrendFullScreen,
    setIsTrendFullScreen,
    showAnalysisMenu,
    setShowAnalysisMenu,
    expandedJson,
    setExpandedJson,
    tablePage,
    setTablePage,
    handleRowClick,
    handleFullDetailedAnalysis,
    handleViewJson,
  };
}
