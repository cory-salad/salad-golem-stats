// charts.js - Reusable chart components for Stats Salad dashboard
// Uses Material-UI, Chart.js, and custom data generators

import React from 'react';
import { Box, Typography } from '@mui/material';
import { Chart } from 'chart.js/auto';
import { generateRandomData, generateStackedData } from './data';

// Default plot height for all charts
const plotHeight = 300;

/**
 * TrendChart - Line chart for single series trends
 * Props:
 *   id: string - unique canvas id
 *   title: string - chart title
 *   trendWindow: string - time window ('month', 'week', 'day')
 *   setTrendWindow: function - updates time window
 *   currentValue: number|null - current value to display
 *   setCurrentValue: function - updates current value
 *   unit: string (optional) - unit to display
 *   unitType: 'front'|'below' (optional) - unit display style
 */
export function TrendChart({ id, title, trendWindow, setTrendWindow, trendData, unit, unitType }) {
  function formatXAxis(ts, window) {
    const date = new Date(ts);
    // Round to hour
    date.setMinutes(0, 0, 0);
    if (window === 'day') {
      // DD HH
      return date.toLocaleString('en-US', { day: '2-digit', hour: '2-digit', hour12: false });
    } else {
      // DD MMM YYYY
      return date.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  React.useEffect(() => {
    const ctx = document.getElementById(id);
    if (ctx) {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
      let numPoints = trendData.length;
      // Format all x labels
      const allLabels = trendData.map(d => formatXAxis(d.x, trendWindow));
      // Pick 5 evenly spaced indices for ticks
      let tickIndices = [];
      if (numPoints > 1) {
        for (let i = 0; i < 5; i++) {
          tickIndices.push(Math.round(i * (numPoints - 1) / 4));
        }
      } else {
        tickIndices = [0];
      }
      ctx._chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: allLabels,
          datasets: [{
            label: title,
            data: trendData.map(d => d.y),
            backgroundColor: 'rgba(83,166,38,0.15)', //  green, semi-transparent
            borderColor: 'rgb(83,166,38)', //  green
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointBorderWidth: 0,
            pointBackgroundColor: 'rgba(0,0,0,0)',
            pointBorderColor: 'rgba(0,0,0,0)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: false } },
          elements: { point: { radius: 0, hoverRadius: 0, borderWidth: 0 } },
          scales: {
            x: {
              title: { display: false },
              ticks: {
                callback: function(value, index) {
                  // Only show ticks at selected indices
                  if (tickIndices.includes(index)) {
                    return this.getLabelForValue(index);
                  }
                  return '';
                },
                autoSkip: false,
                maxTicksLimit: 5
              }
            },
            y: { title: { display: true, text: '' }, beginAtZero: true }
          }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, trendWindow, title, trendData]);

  // Value display logic
  const lastValue = trendData.length > 0 ? trendData[trendData.length - 1].y : null;
  function formatValue(val, unit) {
    if (val === null || val === undefined) return { value: '--', unit };
    // Special handling for GB
    if (unit === 'GB') {
      if (Math.abs(val) >= 1e6) {
        // PB
        let pb = val / 1e6;
        return { value: pb % 1 === 0 ? pb.toFixed(0) : pb.toFixed(pb < 10 ? 2 : 1), unit: 'PB' };
      } else if (Math.abs(val) >= 1e3) {
        // TB
        let tb = val / 1e3;
        return { value: tb % 1 === 0 ? tb.toFixed(0) : tb.toFixed(tb < 10 ? 2 : 1), unit: 'TB' };
      } else {
        return { value: val.toLocaleString(), unit: 'GB' };
      }
    }
    // k/M formatting for other units
    if (Math.abs(val) < 10000) {
      return { value: val.toLocaleString(), unit };
    } else if (Math.abs(val) < 100000) {
      return { value: (val / 1000).toFixed(1) + 'k', unit };
    } else if (Math.abs(val) < 1000000) {
      return { value: Math.round(val / 1000) + 'k', unit };
    } else {
      let m = val / 1000000;
      return { value: m % 1 === 0 ? m.toFixed(0) + 'M' : m.toFixed(m < 10 ? 2 : 1) + 'M', unit };
    }
  }
  let valueDisplay = '--';
  const { value: formattedValue, unit: formattedUnit } = formatValue(lastValue, unit);
  if (lastValue !== null) {
    if (unitType === 'front' && formattedUnit) {
      valueDisplay = (
        <Box display="flex" alignItems="center">
          <Typography variant="body2" sx={{ fontSize: '1.2rem', color: 'rgb(31, 79, 34)', mr: 0.5, fontWeight: 700 }}>{formattedUnit}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'rgb(31, 79, 34)', fontSize: '2.5rem' }}>{formattedValue}</Typography>
        </Box>
      );
    } else if (unitType === 'below' && formattedUnit) {
      valueDisplay = (
        <Box display="flex" flexDirection="column" alignItems="center">
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'rgb(31, 79, 34)', fontSize: '2.5rem' }}>{formattedValue}</Typography>
          <Typography variant="body2" sx={{ fontSize: '1.1rem', color: 'rgb(31, 79, 34)', mt: 0.5, fontWeight: 700 }}>{formattedUnit}</Typography>
        </Box>
      );
    } else {
      valueDisplay = (
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'rgb(31, 79, 34)', fontSize: '2.5rem' }}>{formattedValue}</Typography>
      );
    }
  }

  // Time window options and mapping
  const timeOptions = [
    { key: 'day', label: '1d' },
    { key: 'week', label: '7d' },
    { key: 'month', label: '1m' }
  ];

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ width: '100%' }} className="w-block">
      <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" component="h3" sx={{ textAlign: 'left', color: 'rgb(83,166,38)', flex: '0 0 70%' }} className="w-block">{title}</Typography>
        <Box display="flex" alignItems="center" sx={{ gap: 1, flex: '0 0 auto', ml: 2 }}>
          {timeOptions.map(opt => (
            <button
              key={opt.key}
              className="w-button"
              style={{
                margin: 0,
                padding: '2px 10px',
                fontWeight: 400,
                fontSize: '0.95rem',
                background: trendWindow === opt.key ? '#f5f5f5' : '#fff',
                color: '#aaa',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'background 0.2s',
                minWidth: 36
              }}
              onClick={() => setTrendWindow(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </Box>
      </Box>
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="center" sx={{ width: '100%', maxWidth: 800, mb: 1, mx: 'auto' }} className="w-clearfix">
        <Box sx={{ width: { xs: '100%', sm: 460 }, minWidth: 260 }} className="w-inline-block">
          <canvas id={id} width="100%" height={plotHeight} style={{ width: '100%', maxWidth: 460, minWidth: 260, height: plotHeight, display: 'block' }}></canvas>
        </Box>
        <Box sx={{ ml: { sm: 1.5, xs: 0.5 }, mt: { xs: 1, sm: 0 }, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: unitType === 'below' ? 'center' : 'flex-start' }} className="w-inline-block">
          {valueDisplay}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * StackedChart - Multi-series stacked line chart
 * Props:
 *   id: string - unique canvas id
 *   title: string - chart title
 *   trendWindow: string - time window
 *   setTrendWindow: function - updates time window
 *   labels: array - series labels
 */
export function StackedChart({ id, title, trendWindow, setTrendWindow, labels }) {
  const [chartData, setChartData] = React.useState(null);
  const [currents, setCurrents] = React.useState([]);
  const [isNarrow, setIsNarrow] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 1400 : false);

  // Responsive legend position
  React.useEffect(() => {
    function handleResize() {
      setIsNarrow(window.innerWidth < 1400);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate stacked data when window or labels change
  React.useEffect(() => {
    let numPoints = trendWindow === 'month' ? 100 : trendWindow === 'week' ? 30 : 7;
    const stackedData = generateStackedData(numPoints, labels.length);
    stackedData.datasets.forEach((ds, i) => ds.label = labels[i]);
    setChartData(stackedData);
    setCurrents(stackedData.datasets.map(ds => ds.data[ds.data.length - 1]));
  }, [trendWindow, labels]);

  // Render chart when data changes
  React.useEffect(() => {
    const ctx = document.getElementById(id);
    if (ctx && chartData) {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
      ctx._chartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: false } },
          elements: { point: { radius: 0, hoverRadius: 0, borderWidth: 0 } },
          scales: { x: { title: { display: false } }, y: { stacked: true, title: { display: true, text: 'Value' }, beginAtZero: true } }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, chartData, title]);

  // Color palette for legend swatches
  const legendColors = [
    'rgb(31, 79, 34)', // dark green
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)'
  ];

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ width: '100%' }} className="w-block">
      <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" component="h3" sx={{ textAlign: 'left', color: 'rgb(83,166,38)', flex: '0 0 60%' }} className="w-block">{title}</Typography>
        <Box display="flex" alignItems="center" sx={{ gap: 1, flex: '0 0 auto', ml: 2 }}>
          {[{ key: 'day', label: '1d' }, { key: 'week', label: '7d' }, { key: 'month', label: '1m' }].map(opt => (
            <button
              key={opt.key}
              className="w-button"
              style={{
                margin: 0,
                padding: '2px 10px',
                fontWeight: 400,
                fontSize: '0.95rem',
                background: trendWindow === opt.key ? '#f5f5f5' : '#fff',
                color: '#aaa',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'background 0.2s',
                minWidth: 36
              }}
              onClick={() => setTrendWindow(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </Box>
      </Box>
      <Box display="flex"
        flexDirection={isNarrow ? 'column' : 'row'}
        alignItems="center"
        justifyContent="center"
        sx={{ width: '100%', maxWidth: 800, mb: 1, mx: 'auto' }}
        className="w-clearfix"
      >
        <Box sx={{ width: { xs: '100%', sm: 420 }, minWidth: 240 }} className="w-inline-block">
          <canvas id={id} width="100%" height={plotHeight} style={{ width: '100%', maxWidth: 420, minWidth: 240, height: plotHeight, display: 'block' }}></canvas>
        </Box>
        {/* Legend/value display: right or below chart depending on width */}
        {!isNarrow && (
          <Box sx={{ ml: 1.5, mt: 0, minWidth: 0, flex: 1 }} className="w-inline-block">
            {currents.length > 0 ? (
              currents.map((val, idx) => (
                <Box key={idx} display="flex" alignItems="center" justifyContent="flex-start" sx={{ mb: 1 }} className="w-inline-block">
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: legendColors[idx % legendColors.length], display: 'inline-block', mr: 1, border: '1px solid #bbb' }} />
                  <Typography variant="body2" component="span" sx={{ color: 'rgb(31, 79, 34)', fontSize: '0.875rem', mr: 1, fontWeight: 700 }}>
                    {labels[idx]}: {val}
                  </Typography>
                </Box>
              ))
            ) : '--'}
          </Box>
        )}
        {isNarrow && (
          <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mt: 2 }} className="w-inline-block">
            {currents.length > 0 ? (
              currents.map((val, idx) => (
                <Box key={idx} display="flex" alignItems="center" justifyContent="center" sx={{ mb: 1, mx: 2 }} className="w-inline-block">
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: legendColors[idx % legendColors.length], display: 'inline-block', mr: 1, border: '1px solid #bbb' }} />
                  <Typography variant="body2" component="span" sx={{ color: 'text.primary', fontSize: '0.875rem', mr: 1 }}>
                    {labels[idx]}: {val}
                  </Typography>
                </Box>
              ))
            ) : '--'}
          </Box>
        )}
      </Box>
    </Box>
  );
}