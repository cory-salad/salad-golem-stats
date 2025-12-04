import React from 'react';
import { Box, Typography } from '@mui/material';
import { Chart } from 'chart.js/auto';
import { generateRandomData, generateStackedData } from './data';

  
const plotHeight = 300;


export function TrendChart({ id, title, trendWindow, setTrendWindow, currentValue, setCurrentValue }) {
  React.useEffect(() => {
    const ctx = document.getElementById(id);
    if (ctx) {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
      let numPoints = trendWindow === 'month' ? 100 : trendWindow === 'week' ? 30 : 7;
      const trendData = generateRandomData(numPoints);
      setCurrentValue(trendData[trendData.length - 1]?.y ?? null);
      ctx._chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: trendData.map(d => d.x),
          datasets: [{
            label: title,
            data: trendData.map(d => d.y),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: false } },
          scales: { x: { title: { display: true, text: 'Index' } }, y: { title: { display: true, text: 'Value' }, beginAtZero: true } }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, trendWindow, setCurrentValue, title]);

return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
        <Typography variant="h6" component="h3" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="flex-start" sx={{ width: '100%', maxWidth: 700, mb: 1 }}>
          <Box sx={{ width: { xs: '100%', sm: 600 }, minWidth: 300 }}>
            <canvas id={id} width="100%" height="160" style={{ width: '100%', maxWidth: 600, minWidth: 300, height: 160, display: 'block' }}></canvas>
          </Box>
          <Typography variant="h4" component="div" color="primary" sx={{ ml: { sm: 1, xs: 0 }, mt: { xs: 1, sm: 0 }, whiteSpace: 'nowrap', minWidth: 0 }}>
            {currentValue !== null ? currentValue : '--'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', mt: 1 }}>
            {globalThis.trendWindows?.map?.(win => (
                <button
                    key={win}
                    style={{ margin: '0 4px', padding: '4px 12px', background: trendWindow === win ? '#1976d2' : '#eee', color: trendWindow === win ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => setTrendWindow(win)}
                >
                    Last {win}
                </button>
            )) ?? ['month', 'week', 'day'].map(win => (
                <button
                    key={win}
                    style={{ margin: '0 4px', padding: '4px 12px', background: trendWindow === win ? '#1976d2' : '#eee', color: trendWindow === win ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => setTrendWindow(win)}
                >
                    Last {win}
                </button>
            ))}
        </Box>
    </Box>
);
}

export function StackedChart({ id, title, trendWindow, setTrendWindow, stackedCurrents, setStackedCurrents }) {
  React.useEffect(() => {
    const ctx = document.getElementById(id);
    if (ctx) {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
      let numPoints = trendWindow === 'month' ? 100 : trendWindow === 'week' ? 30 : 7;
      const stackedData = generateStackedData(numPoints, 5);
      setStackedCurrents(stackedData.datasets.map(ds => ds.data[ds.data.length - 1]));
      ctx._chartInstance = new Chart(ctx, {
        type: 'line',
        data: stackedData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: false } },
          scales: { x: { title: { display: true, text: 'Index' } }, y: { stacked: true, title: { display: true, text: 'Value' }, beginAtZero: true } }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, trendWindow, setStackedCurrents, title]);
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
      <Typography variant="h6" component="h3" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="flex-start" sx={{ width: '100%', maxWidth: 700, mb: 1 }}>
        <Box sx={{ width: { xs: '100%', sm: 600 }, minWidth: 300 }}>
          <canvas id={id} width="100%" height="160" style={{ width: '100%', maxWidth: 600, minWidth: 300, height: 160, display: 'block' }}></canvas>
        </Box>
        <Box sx={{ ml: { sm: 1, xs: 0 }, mt: { xs: 1, sm: 0 }, whiteSpace: 'nowrap', minWidth: 0 }}>
          {stackedCurrents.length > 0 ? (
            stackedCurrents.map((val, idx) => (
              <Box key={idx} display="flex" alignItems="center" justifyContent="flex-start" sx={{ mb: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: `rgba(${[255,99,132,54,162,235,255,206,86,75,192,192,153,102,255][idx*3]},${[255,99,132,54,162,235,255,206,86,75,192,192,153,102,255][idx*3+1]},${[255,99,132,54,162,235,255,206,86,75,192,192,153,102,255][idx*3+2]},1)`, display: 'inline-block', mr: 1, border: '1px solid #bbb' }} />
                <Typography variant="body2" component="span" sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                  {val}
                </Typography>
              </Box>
            ))
          ) : '--'}
        </Box>
      </Box>
      <Box sx={{ textAlign: 'center', mt: 1 }}>
        {['month', 'week', 'day'].map(win => (
          <button
            key={win}
            style={{ margin: '0 4px', padding: '4px 12px', background: trendWindow === win ? '#1976d2' : '#eee', color: trendWindow === win ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setTrendWindow(win)}
          >
            Last {win}
          </button>
        ))}
      </Box>
    </Box>
  );
}

export function BarChart({ id, title, trendWindow, setTrendWindow, currentValue, setCurrentValue }) {
  React.useEffect(() => {
    const ctx = document.getElementById(id);
    if (ctx) {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
      let numPoints = trendWindow === 'month' ? 100 : trendWindow === 'week' ? 30 : 7;
      const trendData = generateRandomData(numPoints);
      setCurrentValue(trendData[trendData.length - 1]?.y ?? null);
      ctx._chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: trendData.map(d => d.x),
          datasets: [{
            label: title,
            data: trendData.map(d => d.y),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: false } },
          scales: { x: { title: { display: true, text: 'Index' } }, y: { title: { display: true, text: 'Value' }, beginAtZero: true } }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, trendWindow, setCurrentValue, title]);
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
      <Typography variant="h6" component="h3" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="flex-start" sx={{ width: '100%', maxWidth: 700, mb: 1 }}>
        <Box sx={{ width: { xs: '100%', sm: 600 }, minWidth: 300 }}>
          <canvas id={id} width="100%" height="160" style={{ width: '100%', maxWidth: 600, minWidth: 300, height: 160, display: 'block' }}></canvas>
        </Box>
        <Typography variant="h4" component="div" color="primary" sx={{ ml: { sm: 1, xs: 0 }, mt: { xs: 1, sm: 0 }, whiteSpace: 'nowrap', minWidth: 0 }}>
          {currentValue !== null ? currentValue : '--'}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center', mt: 1 }}>
        {['month', 'week', 'day'].map(win => (
          <button
            key={win}
            style={{ margin: '0 4px', padding: '4px 12px', background: trendWindow === win ? '#1976d2' : '#eee', color: trendWindow === win ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setTrendWindow(win)}
          >
            Last {win}
          </button>
        ))}
      </Box>
    </Box>
  );
}
