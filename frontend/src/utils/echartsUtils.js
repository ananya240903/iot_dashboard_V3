export const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
  '#3b82f6', '#eab308', '#a855f7', '#f43f5e', '#22c55e',
  '#0ea5e9', '#d946ef', '#64748b', '#c026d3', '#059669'
];

export const tooltipFormatter = (params, activeSeriesName) => {
  if (!params || !params.length) return '';
  const label = params[0].axisValue;
  const axles = {};
  let hasMultipleMetrics = false;

  params.forEach(entry => {
    const dataKey = entry.seriesName;
    const match = dataKey.match(/^([LR])(\d+)_/);
    const hasAlert = entry.data && entry.data.hasAlert;

    if (match) {
      const side = match[1];
      const axleNum = match[2];
      if (!axles[axleNum]) axles[axleNum] = {};
      if (axles[axleNum][side]) hasMultipleMetrics = true;
      axles[axleNum][side] = {
        value: entry.value !== undefined ? entry.value : entry.data.value,
        color: entry.color,
        hasAlert: hasAlert
      };
    }
  });

  if (Object.keys(axles).length === 0 || hasMultipleMetrics) {
    let html = `
             <div class="bg-white/20  border border-slate-200/50  p-4 rounded-xl shadow-xl z-50">
                 <p class="font-bold text-slate-800  mb-2 border-b border-slate-100  pb-2">${label}</p>
         `;
    params.forEach(entry => {
      const hasAlert = entry.data && entry.data.hasAlert;
      html += `
                 <div class="flex items-center gap-2 mb-1" style="color: ${entry.color}">
                     <span class="font-semibold">${entry.seriesName}:</span>
                     <span>${entry.value !== undefined ? entry.value : entry.data.value}</span>
                     ${hasAlert ? `<span class="text-red-500 font-bold ml-1">(! Alert)</span>` : ''}
                 </div>
             `;
    });
    html += `</div>`;
    return html;
  }

  let html = `
        <div class="bg-white/20  border border-slate-200/50  p-4 rounded-xl shadow-xl min-w-[250px] z-50">
            <p class="font-bold text-slate-800  mb-3 border-b border-slate-200/50  pb-2 flex justify-between items-center">
                <span>${label}</span>
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-hidden">
    `;

  Object.keys(axles).sort((a, b) => Number(a) - Number(b)).forEach(axleNum => {
    const left = axles[axleNum]['L'];
    const right = axles[axleNum]['R'];
    let isBlinking = false;
    let activeSide = null;
    if (activeSeriesName) {
      const match = activeSeriesName.match(/^([LR])(\d+)_/);
      if (match && match[2] === String(axleNum)) {
        isBlinking = true;
        activeSide = match[1];
      }
    }

    const leftActive = activeSide === 'L';
    const rightActive = activeSide === 'R';

    html += `
            <div class="flex flex-col gap-1 bg-white/40  p-2 rounded-lg border transition-all duration-300 ${isBlinking ? 'axle-active-box' : 'border-slate-200/50 '} shadow-sm">
                <div class="text-xs font-bold ${isBlinking ? 'active-text' : 'text-slate-600 '} uppercase tracking-wider mb-1">Axle ${axleNum}</div>
                <div class="flex justify-between items-center gap-4">
        `;

    if (left) {
      html += `
                    <div class="flex items-center gap-2 flex-1" style="color: ${left.color}">
                        <span class="font-semibold w-4 ${leftActive ? 'active-text' : ''}">L${axleNum}</span>
                        <span class="font-mono px-1.5 py-0.5 rounded border transition-all duration-300 ${leftActive ? 'active-badge' : 'bg-slate-50/50  border-slate-200/50  text-slate-900  font-bold'}">${left.value}</span>
                        ${left.hasAlert ? `<span class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse inline-block ml-1"></span>` : ''}
                    </div>
            `;
    } else {
      html += `<div class="flex-1 text-slate-400  italic text-xs">No Data</div>`;
    }

    html += `<div class="w-px h-6 bg-slate-300/50 "></div>`;

    if (right) {
      html += `
                    <div class="flex items-center gap-2 flex-1 justify-end" style="color: ${right.color}">
                        ${right.hasAlert ? `<span class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse inline-block mr-1"></span>` : ''}
                        <span class="font-mono px-1.5 py-0.5 rounded border transition-all duration-300 ${rightActive ? 'active-badge' : 'bg-slate-50/50  border-slate-200/50  text-slate-900  font-bold'}">${right.value}</span>
                        <span class="font-semibold w-4 text-right ${rightActive ? 'active-text' : ''}">R${axleNum}</span>
                    </div>
            `;
    } else {
      html += `<div class="flex-1 text-slate-400  italic text-xs text-right">No Data</div>`;
    }

    html += `</div></div>`;
  });

  html += `</div></div>`;
  return html;
};

export const getEChartsOption = (graph, chartData, isTrendFullScreen, isolatedSeriesForGraph, hoveredSeriesRef) => {
  const xAxisData = chartData.map(item => item.time);

  const series = graph.keysToRender.map((key, i) => {
    const dataKeyColor = COLORS[i % COLORS.length];
    return {
      name: key,
      type: 'line',
      triggerEvent: true,
      data: chartData.map(item => {
        const hasAlert = item[`${key}_hasAlert`];
        return {
          value: item[key],
          hasAlert: hasAlert,
          itemStyle: {
            color: hasAlert ? '#ef4444' : dataKeyColor,
            borderColor: hasAlert ? '#ffffff' : dataKeyColor,
            borderWidth: hasAlert ? 2 : 0,
            shadowColor: hasAlert ? 'rgba(239, 68, 68, 0.6)' : 'transparent',
            shadowBlur: hasAlert ? 8 : 0
          }
        };
      }),
      lineStyle: {
        width: 2,
        color: dataKeyColor
      },
      itemStyle: {
        color: dataKeyColor
      },
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: chartData.length <= 200,
      large: true,
      largeThreshold: 400,
      connectNulls: true,
      smooth: 0.3,
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 3
        }
      },
      animation: chartData.length <= 100,
      markPoint: {
        symbol: 'circle',
        symbolSize: 14,
        itemStyle: {
          color: '#ef4444',
          borderColor: '#ffffff',
          borderWidth: 2,
          shadowColor: 'rgba(239, 68, 68, 0.6)',
          shadowBlur: 8
        },
        label: { show: false },
        data: chartData.map((item, index) => {
          if (item[`${key}_hasAlert`]) {
            return {
              xAxis: index,
              yAxis: item[key],
              name: 'Alert'
            };
          }
          return null;
        }).filter(Boolean)
      }
    };
  });

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', width: 2, type: 'dashed' } },
      formatter: (params) => tooltipFormatter(params, isolatedSeriesForGraph || (hoveredSeriesRef && hoveredSeriesRef.current ? hoveredSeriesRef.current[graph.title] : null)),
      backgroundColor: 'transparent',
      padding: 0,
      borderWidth: 0,
      shadowBlur: 0,
      extraCssText: 'box-shadow: none; pointer-events: none;',
      appendToBody: true,
      confine: true,
      animation: false,
      transitionDuration: 0
    },
    legend: {
      data: graph.keysToRender,
      bottom: 0,
      left: 'center',
      icon: 'circle',
      type: 'plain',
      itemGap: 15,
      textStyle: { color: '#64748b', fontSize: 12, fontWeight: 500 },
      selected: isolatedSeriesForGraph ? graph.keysToRender.reduce((acc, key) => {
        acc[key] = (key === isolatedSeriesForGraph);
        return acc;
      }, {}) : graph.keysToRender.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    },
    grid: {
      left: '2%',
      right: '3%',
      bottom: isTrendFullScreen ? 130 : 90,
      top: 20,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, margin: 12 }
    },
    yAxis: {
      type: 'value',
      scale: true,
      boundaryGap: ['5%', '10%'],
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 11, margin: 12 }
    },
    dataZoom: [
      {
        type: 'slider',
        show: isTrendFullScreen,
        xAxisIndex: [0],
        bottom: 65,
        height: 24,
        borderColor: 'transparent',
        backgroundColor: '#f8fafc',
        fillerColor: 'rgba(99, 102, 241, 0.08)',
        handleStyle: { color: '#6366f1', borderColor: '#ffffff', borderWidth: 2, shadowBlur: 4, shadowColor: 'rgba(0,0,0,0.1)' },
        dataBackground: {
          lineStyle: { color: '#cbd5e1', width: 1 },
          areaStyle: { color: '#e2e8f0', opacity: 0.4 }
        },
        selectedDataBackground: {
          lineStyle: { color: '#6366f1', width: 1 },
          areaStyle: { color: '#818cf8', opacity: 0.2 }
        }
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        disabled: !isTrendFullScreen
      }
    ],
    series: series,
    color: COLORS
  };
};

export const eChartsTooltipStylesHTML = `
      @keyframes borderPing {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
      }
      .axle-active-box {
          border-color: #818cf8 !important;
          background-color: rgba(99, 102, 241, 0.04) !important;
          animation: borderPing 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
      }
      .dark .axle-active-box {
          border-color: #6366f1 !important;
          background-color: rgba(99, 102, 241, 0.15) !important;
      }
      .active-badge {
          background-color: #4f46e5 !important;
          color: white !important;
          border-color: #4338ca !important;
          box-shadow: 0 0 12px rgba(79, 70, 229, 0.6) !important;
          transform: scale(1.05);
      }
      .active-text {
          color: #4f46e5 !important;
          font-weight: 900 !important;
      }
      .dark .active-badge {
          background-color: #6366f1 !important;
          border-color: #4f46e5 !important;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.6) !important;
      }
      .dark .active-text {
          color: #818cf8 !important;
      }
`;
