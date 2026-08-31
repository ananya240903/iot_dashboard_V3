import React from 'react';
import ReactECharts from 'echarts-for-react';
import { getEChartsOption } from '../../utils/echartsUtils';

export default function TrendChartsSection({
  groupedTrendData,
  schemaNumericKeys,
  selectedRowAlerts,
  isTrendFullScreen,
  isolatedSeries,
  setIsolatedSeries,
  hoveredSeriesRef
}) {
  return (
    <div className={`p-6 border-b border-slate-100  bg-slate-50/30  flex flex-col gap-8 ${isTrendFullScreen ? 'flex-1' : 'shrink-0'}`}>
      {Object.keys(groupedTrendData).map((schemaSignature, idx) => {
        const numericKeys = schemaNumericKeys[schemaSignature] || [];
        const isRsAnalysis = selectedRowAlerts?.analysisType === 'rs';

        // Limit points initially to make it lighting fast unless full screen
        const chartData = isTrendFullScreen
          ? groupedTrendData[schemaSignature]
          : groupedTrendData[schemaSignature].slice(-50);

        let graphsToRender = [];
        if (isRsAnalysis) {
          const baseMetrics = schemaSignature.split(', ');
          baseMetrics.forEach(baseMetric => {
            const specificKeys = numericKeys.filter(k => k.endsWith(`_${baseMetric}`));
            if (specificKeys.length > 0) {
              graphsToRender.push({
                title: `Rolling Stock Trend Analysis: ${baseMetric}`,
                keysToRender: specificKeys
              });
            }
          });
        } else {
          graphsToRender.push({
            title: `Device Data Trend Analysis ${Object.keys(groupedTrendData).length > 1 ? `(${schemaSignature})` : ''}`,
            keysToRender: numericKeys
          });
        }

        return graphsToRender.map((graph, gIdx) => (
          <div key={`${idx}-${gIdx}`} className={`${gIdx > 0 || idx > 0 ? "mt-8" : ""} ${isTrendFullScreen ? "flex-1 flex flex-col min-h-[500px]" : ""}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-700">
                {graph.title} {!isTrendFullScreen && <span className="font-normal text-xs text-slate-400 ml-2">(Showing last {chartData.length} points)</span>}
              </h3>
              {isolatedSeries[graph.title] && (
                <button
                  onClick={() => setIsolatedSeries(prev => { const next = { ...prev }; delete next[graph.title]; return next; })}
                  className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full transition-colors font-semibold shadow-sm border border-indigo-200"
                >
                  Show All Lines
                </button>
              )}
            </div>
            <div className={`w-full ${isTrendFullScreen ? "flex-1" : "h-[300px] shrink-0"}`}>
              <ReactECharts
                option={getEChartsOption(graph, chartData, isTrendFullScreen, isolatedSeries[graph.title], hoveredSeriesRef)}
                style={{ height: '100%', width: '100%' }}
                lazyUpdate={true}
                notMerge={true}
                opts={{ renderer: 'canvas' }}
                onEvents={{
                  'click': (params) => {
                    if (params.componentType === 'series' || params.componentType === 'markPoint') {
                      setIsolatedSeries(prev => ({
                        ...prev,
                        [graph.title]: params.seriesName
                      }));
                    }
                  },
                  'mouseover': (params) => {
                    if (params.componentType === 'series' || params.componentType === 'markPoint') {
                      hoveredSeriesRef.current[graph.title] = params.seriesName;
                    }
                  },
                  'mouseout': (params) => {
                    if (params.componentType === 'series' || params.componentType === 'markPoint') {
                      hoveredSeriesRef.current[graph.title] = null;
                    }
                  }
                }}
              />
            </div>
          </div>
        ));
      })}
    </div>
  );
}
