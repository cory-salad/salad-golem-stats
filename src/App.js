import React, { useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { Container, Typography, Box, Paper, Grid, ThemeProvider, createTheme } from '@mui/material';
import { Chart } from 'chart.js/auto';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 800,
      lg: 1200,
      xl: 1536,
    },
  },
});

function generateRandomData(numPoints = 100) {
  // Generate 100 random points for a trend graph
  // For stacked plot, generate 5 series
  const data = [];
  for (let i = 0; i < numPoints; i++) {
    data.push({
      x: i,
      y: Math.floor(Math.random() * 100)
    });
  }
  return data;
}

function generateStackedData(numPoints = 100, numSeries = 5) {
  const colors = [
    'rgba(255, 99, 132, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(255, 206, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(153, 102, 255, 0.6)'
  ];
  const borderColors = [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)'
  ];
  const labels = Array.from({ length: numPoints }, (_, i) => i);
  const datasets = [];
  for (let s = 0; s < numSeries; s++) {
    const data = Array.from({ length: numPoints }, () => Math.floor(Math.random() * 50 + s * 10));
    datasets.push({
      label: `Series ${s + 1}`,
      data,
      backgroundColor: colors[s],
      borderColor: borderColors[s],
      borderWidth: 1,
      fill: true
    });
  }
  return { labels, datasets };
}

function TrendChart({ id, title, trendWindow, setTrendWindow, currentValue, setCurrentValue }) {
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
          plugins: { legend: { display: false }, title: { display: false } },
          scales: { x: { title: { display: true, text: 'Index' } }, y: { title: { display: true, text: 'Value' }, beginAtZero: true } }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, trendWindow, setCurrentValue, title]);
  return (
    <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="center">
      <Box flex={2}>
        <Typography variant="h6" component="h3" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
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
        <canvas id={id} width="400" height="250"></canvas>
      </Box>
      <Box flex={1} sx={{ textAlign: 'center', ml: { md: 2, xs: 0 }, mt: { xs: 2, md: 0 } }}>
        <Typography variant="h2" component="div" color="primary">
          {currentValue !== null ? currentValue : '--'}
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">Current Value</Typography>
      </Box>
    </Box>
  );
}

function StackedChart({ id, title, trendWindow, setTrendWindow, stackedCurrents, setStackedCurrents }) {
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
          plugins: { legend: { display: false }, title: { display: false } },
          scales: { x: { title: { display: true, text: 'Index' } }, y: { stacked: true, title: { display: true, text: 'Value' }, beginAtZero: true } }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, trendWindow, setStackedCurrents, title]);
  return (
    <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="center">
      <Box flex={2}>
        <Typography variant="h6" component="h3" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
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
        <canvas id={id} width="400" height="250"></canvas>
      </Box>
      <Box flex={1} sx={{ textAlign: 'center', ml: { md: 2, xs: 0 }, mt: { xs: 2, md: 0 } }}>
        {stackedCurrents.length > 0 ? (
          stackedCurrents.map((val, idx) => (
            <Box key={idx} display="flex" alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: `rgba(${[255,99,132,54,162,235,255,206,86,75,192,192,153,102,255][idx*3]},${[255,99,132,54,162,235,255,206,86,75,192,192,153,102,255][idx*3+1]},${[255,99,132,54,162,235,255,206,86,75,192,192,153,102,255][idx*3+2]},1)`, display: 'inline-block', mr: 1, border: '1px solid #bbb' }} />
              <Typography variant="body1" component="span" sx={{ color: 'text.primary', fontSize: '1rem', ml: 1 }}>
                Series {idx + 1}: {val}
              </Typography>
            </Box>
          ))
        ) : '--'}
      </Box>
    </Box>
  );
}

function BarChart({ id, title, trendWindow, setTrendWindow, currentValue, setCurrentValue }) {
  React.useEffect(() => {
    const ctx = document.getElementById(id);
    if (ctx) {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
      let numPoints = trendWindow === 'month' ? 100 : trendWindow === 'week' ? 30 : 7;
      const trendData = generateRandomData(numPoints);
      setCurrentValue(trendData[trendData.length - 1]?.y ?? null);
      ctx._chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: trendData.map(d => d.x),
          datasets: [{
            label: title,
            data: trendData.map(d => d.y),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false }, title: { display: false } },
          scales: { x: { title: { display: true, text: 'Index' } }, y: { title: { display: true, text: 'Value' }, beginAtZero: true } }
        }
      });
    }
    return () => { if (ctx && ctx._chartInstance) ctx._chartInstance.destroy(); };
  }, [id, trendWindow, setCurrentValue, title]);
  return (
    <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="center">
      <Box flex={2}>
        <Typography variant="h6" component="h3" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
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
        <canvas id={id} width="400" height="250"></canvas>
      </Box>
      <Box flex={1} sx={{ textAlign: 'center', ml: { md: 2, xs: 0 }, mt: { xs: 2, md: 0 } }}>
        <Typography variant="h2" component="div" color="primary">
          {currentValue !== null ? currentValue : '--'}
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">Current Value</Typography>
      </Box>
    </Box>
  );
}

function App() {
  // Set globe background color after mount
  React.useEffect(() => {
    if (globeRef.current && globeRef.current.scene) {
      const scene = globeRef.current.scene();
      if (scene && scene.background) {
        scene.background.set('#f5f5f5');
      } else if (scene) {
        scene.background = new THREE.Color('#f5f5f5');
      }
    }
  }, []);
  const [computeCurrent, setComputeCurrent] = useState(null);
  const [feesCurrent, setFeesCurrent] = useState(null);
  const [gpuStackedCurrents, setGpuStackedCurrents] = useState([]);
  const [cpuCurrent, setCpuCurrent] = useState(null);
  const [memoryCurrent, setMemoryCurrent] = useState(null);
  const [priceCurrent, setPriceCurrent] = useState(null);
  const [volumeCurrent, setVolumeCurrent] = useState(null);
  const [marketCapCurrent, setMarketCapCurrent] = useState(null);
  const [trendWindows, setTrendWindows] = useState({
    compute: 'month',
    fees: 'month',
    gpuStacked: 'month',
    gpuVram: 'month',
    cpu: 'month',
    memory: 'month',
    price: 'month',
    volume: 'month',
    marketCap: 'month',
  });

  const globeRef = React.useRef();

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4, overflowX: 'auto' }}>
        <Container maxWidth="xl" sx={{ bgcolor: 'transparent', px: { xs: 1, sm: 2, md: 6 } }}>
          <Paper elevation={4} sx={{ bgcolor: '#1976d2', color: 'white', py: 3, mb: 4, borderRadius: 4, textAlign: 'center', maxWidth: '98vw', mx: 'auto', px: 6 }}>
            <Typography variant="h2" component="h1">Stats Salad Dashboard</Typography>
          </Paper>
          <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ textAlign: 'center' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, urna eu tincidunt consectetur, nisi nisl aliquam enim, eget cursus enim urna euismod nisi. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam at risus et justo dignissim congue. Donec congue lacinia dui, a porttitor lectus condimentum laoreet. Nunc eu ullamcorper orci. Quisque eget odio ac lectus vestibulum faucibus eget in metus. In pellentesque faucibus vestibulum. Nulla at nulla justo, eget luctus tortor. Nulla facilisi. Duis aliquet egestas purus in blandit.
              </Typography>
          </Box>
          {/* Network Section */}
          <Paper elevation={2} sx={{ mb: 4, borderRadius: 4, p: 4, bgcolor: '#fff', maxWidth: '96vw', mx: 'auto' }}>
            <Typography variant="h4" component="h2" sx={{ mb: 3 }}>Network</Typography>
            {/* Usage */}
            <Typography variant="h5" sx={{ mt: 2, mb: 2 }}>Usage</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TrendChart id="computeChart" title="Compute (hours)" trendWindow={trendWindows.compute} setTrendWindow={win => setTrendWindows(w => ({ ...w, compute: win }))} currentValue={computeCurrent} setCurrentValue={setComputeCurrent} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TrendChart id="feesChart" title="Fees ($)" trendWindow={trendWindows.fees} setTrendWindow={win => setTrendWindows(w => ({ ...w, fees: win }))} currentValue={feesCurrent} setCurrentValue={setFeesCurrent} />
              </Grid>
            </Grid>
            {/* Resources Utilized */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Resources Utilized</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StackedChart id="gpuStackedChart" title="GPUs by Model" trendWindow={trendWindows.gpuStacked} setTrendWindow={win => setTrendWindows(w => ({ ...w, gpuStacked: win }))} stackedCurrents={gpuStackedCurrents} setStackedCurrents={setGpuStackedCurrents} />
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 1 }}>
                  5090s, 4090s, 3090s, 3060s, Other
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <BarChart id="gpuVramChart" title="GPUs by VRAM (count)" trendWindow={trendWindows.gpuVram} setTrendWindow={win => setTrendWindows(w => ({ ...w, gpuVram: win }))} currentValue={null} setCurrentValue={() => {}} />
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 1 }}>
                  24GB, 12GB, 8GB, &lt;8GB
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TrendChart id="cpuChart" title="CPUs (cores)" trendWindow={trendWindows.cpu} setTrendWindow={win => setTrendWindows(w => ({ ...w, cpu: win }))} currentValue={cpuCurrent} setCurrentValue={setCpuCurrent} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TrendChart id="memoryChart" title="Memory (GB)" trendWindow={trendWindows.memory} setTrendWindow={win => setTrendWindows(w => ({ ...w, memory: win }))} currentValue={memoryCurrent} setCurrentValue={setMemoryCurrent} />
              </Grid>
            </Grid>
            {/* Distribution - utilized */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Distribution - Utilized</Typography>
            <Box sx={{ width: '100%', height: 500, bgcolor: '#e3e3e3', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
              <Globe
                ref={globeRef}
                width={800}
                height={480}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              />
            </Box>
            {/* Token Section */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Token</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TrendChart id="priceChart" title="$ Price" trendWindow={trendWindows.price} setTrendWindow={win => setTrendWindows(w => ({ ...w, price: win }))} currentValue={priceCurrent} setCurrentValue={setPriceCurrent} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TrendChart id="volumeChart" title="Volume" trendWindow={trendWindows.volume} setTrendWindow={win => setTrendWindows(w => ({ ...w, volume: win }))} currentValue={volumeCurrent} setCurrentValue={setVolumeCurrent} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TrendChart id="marketCapChart" title="Market Capitalization" trendWindow={trendWindows.marketCap} setTrendWindow={win => setTrendWindows(w => ({ ...w, marketCap: win }))} currentValue={marketCapCurrent} setCurrentValue={setMarketCapCurrent} />
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
