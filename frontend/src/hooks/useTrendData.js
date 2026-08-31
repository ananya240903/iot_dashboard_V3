import { useMemo } from 'react';

export function useTrendData(selectedRowAlerts, enableDownsampling = false) {
  return useMemo(() => {
    let groupedTrendData = {};
    let schemaNumericKeys = {};
    let hasTrendData = false;

    if (selectedRowAlerts?.data?.length > 0) {
      const isRsAnalysis = selectedRowAlerts.analysisType === 'rs';
      const schemaTimeGroupedData = {};

      selectedRowAlerts.data.filter(item => item.wheelJson && !item.wheelJson.error).forEach(item => {
        const deviceData = item.wheelJson.deviceData || item.wheelJson;
        const position = item.wheelJson.position || item.wheelJson.vehicleSide || 'Unknown';
        const prefix = (selectedRowAlerts.analysisType === 'wheel' || !selectedRowAlerts.analysisType) ? '' : `${position}_`;

        const rawKeys = Object.keys(deviceData).filter(key => {
          const val = parseFloat(deviceData[key]);
          return !isNaN(val) && typeof deviceData[key] !== 'object' && !['id', 'hasAlert', 'position', 'vehicleSide', 'vehicleAxleNumber', 'no', 'rsNo', 'rsno', 'readingTimestamp', 'readingTimestampUtc', 'timestamp', 'timestampUtc', 'speedKmph', 'speed', 'wheelNo'].includes(key);
        });

        if (rawKeys.length === 0) return;

        const dt = new Date(item.reading_timestamp);
        const timeLabel = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;

        if (isRsAnalysis) {
          rawKeys.forEach(key => {
            const schemaSignature = key;
            if (!schemaTimeGroupedData[schemaSignature]) schemaTimeGroupedData[schemaSignature] = {};
            if (!schemaTimeGroupedData[schemaSignature][timeLabel]) {
              schemaTimeGroupedData[schemaSignature][timeLabel] = { time: timeLabel, originalTimestamp: item.reading_timestamp };
            }

            const finalKey = prefix ? `${prefix}${key}` : key;
            schemaTimeGroupedData[schemaSignature][timeLabel][finalKey] = parseFloat(deviceData[key]) || 0;
            schemaTimeGroupedData[schemaSignature][timeLabel][`${finalKey}_hasAlert`] = item.hasAlert;

            if (!schemaNumericKeys[schemaSignature]) schemaNumericKeys[schemaSignature] = new Set();
            schemaNumericKeys[schemaSignature].add(finalKey);
          });
        } else {
          const schemaSignature = rawKeys.sort().join(', ');
          if (!schemaTimeGroupedData[schemaSignature]) schemaTimeGroupedData[schemaSignature] = {};
          if (!schemaTimeGroupedData[schemaSignature][timeLabel]) {
            schemaTimeGroupedData[schemaSignature][timeLabel] = { time: timeLabel, originalTimestamp: item.reading_timestamp };
          }

          rawKeys.forEach(key => {
            const finalKey = prefix ? `${prefix}${key}` : key;
            schemaTimeGroupedData[schemaSignature][timeLabel][finalKey] = parseFloat(deviceData[key]) || 0;
            schemaTimeGroupedData[schemaSignature][timeLabel][`${finalKey}_hasAlert`] = item.hasAlert;

            if (!schemaNumericKeys[schemaSignature]) schemaNumericKeys[schemaSignature] = new Set();
            schemaNumericKeys[schemaSignature].add(finalKey);
          });
        }
        hasTrendData = true;
      });

      Object.keys(schemaTimeGroupedData).forEach(schema => {
        groupedTrendData[schema] = Object.values(schemaTimeGroupedData[schema]);
      });

      Object.keys(schemaNumericKeys).forEach(metric => {
        schemaNumericKeys[metric] = Array.from(schemaNumericKeys[metric]).sort();
      });

      Object.keys(groupedTrendData).forEach(metric => {
        let points = groupedTrendData[metric].sort((a, b) => new Date(a.originalTimestamp) - new Date(b.originalTimestamp));

        if (enableDownsampling && points.length > 500) {
          const step = Math.ceil(points.length / 500);
          const downsampled = [];
          for (let i = 0; i < points.length; i += step) {
            downsampled.push(points[i]);
          }
          groupedTrendData[metric] = downsampled;
        } else {
          groupedTrendData[metric] = points;
        }
      });
    }

    return { groupedTrendData, schemaNumericKeys, hasTrendData };
  }, [selectedRowAlerts, enableDownsampling]);
}
