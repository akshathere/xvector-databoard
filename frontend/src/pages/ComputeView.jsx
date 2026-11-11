import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/client';
import ReactECharts from 'echarts-for-react';

export default function ComputeView() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [previewData, setPreviewData] = useState(null);
  
  // Compute States
  const [statCol, setStatCol] = useState('');
  const [operation, setOperation] = useState('sum');
  const [statResult, setStatResult] = useState(null);
  const [isCached, setIsCached] = useState(false);

  // Plotting States
  const [xAxisCol, setXAxisCol] = useState('');
  const [yAxisCol, setYAxisCol] = useState('');
  const [plotType, setPlotType] = useState('bar');
  const [plotAgg, setPlotAgg] = useState('sum');
  const [plotData, setPlotData] = useState(null);
  const [isPlotLoading, setIsPlotLoading] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await api.get(`/dataset/${id}/preview`);
        setPreviewData(res.data);
      } catch (err) {
        toast.error('Failed to load dataset.');
        navigate('/dashboard');
      }
    };
    fetchPreview();
  }, [id, navigate]);

  const handleCompute = async () => {
    if (!statCol) return toast.warning('Select a column.');
    try {
      const res = await api.post(`/dataset/${id}/compute`, { column: statCol, operation });
      setStatResult(res.data.result);
      setIsCached(res.data.cached);
      toast.success('Computation complete!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Computation failed');
    }
  };

  // NEW: Fetch data specifically from your /plot endpoint
  const handleFetchPlot = async () => {
    if (!xAxisCol || !yAxisCol) return toast.warning('Please select both X and Y columns.');
    setIsPlotLoading(true);
    try {
      const res = await api.get(`/dataset/${id}/plot`, { params: { col1: xAxisCol, col2: yAxisCol, agg: plotAgg } });
      setPlotData(res.data);
      if (res.data.truncated) {
        toast.info(plotAgg === 'none'
          ? `Showing ${res.data.data.length} evenly sampled points of ${res.data.total}.`
          : `Showing top ${res.data.data.length} of ${res.data.total} categories.`);
      } else {
        toast.success('Plot data loaded successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fetch plot data');
    } finally {
      setIsPlotLoading(false);
    }
  };

  // Bars summarise a category; scatter shows raw points
  const handlePlotTypeChange = (type) => {
    setPlotType(type);
    setPlotAgg(type === 'scatter' ? 'none' : 'sum');
  };

  // Dynamically generate the Apache ECharts config using the plotData from the backend
  const getChartOptions = () => {
    if (!plotData) return {};
    
    const { col1, col2, agg, data } = plotData;
    const numericX = data.every(r => typeof r.x === 'number');
    // Text X values (e.g. industry names) can only go on a category axis
    const categoryAxis = plotType === 'bar' || !numericX;

    // Server already orders aggregated data; only sort numeric X to prevent "spaghetti" line charts
    const sortedData = numericX ? [...data].sort((a, b) => a.x - b.x) : data;
    const yLabel = agg === 'none' ? col2 : agg === 'count' ? 'count' : `${agg}(${col2})`;

    return {
      tooltip: {
        trigger: plotType === 'bar' ? 'axis' : 'item',
        backgroundColor: '#1e293b',
        textStyle: { color: '#f8fafc' },
        borderWidth: 0
      },
      grid: { left: '5%', right: '5%', bottom: '10%', top: '10%', containLabel: true },
      xAxis: {
        // 2. Treat X-axis as continuous numbers for Line and Scatter plots
        type: categoryAxis ? 'category' : 'value',
        data: categoryAxis ? sortedData.map(r => r.x) : undefined,
        scale: !categoryAxis,
        name: col1,
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: { color: '#94a3b8' },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: yLabel,
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }
      },
      series: [
        {
          type: plotType,
          // 3. Map as strict [x, y] coordinate pairs for Line and Scatter
          data: categoryAxis
            ? sortedData.map(r => r.y)
            : sortedData.map(r => [r.x, r.y]),
          itemStyle: { color: plotType === 'bar' ? '#38bdf8' : plotType === 'line' ? '#a855f7' : '#10b981' },
          symbolSize: plotType === 'scatter' ? 8 : 6,
          smooth: plotType === 'line'
        }
      ]
    };
  };

  if (!previewData) return <h3 style={{ color: '#94a3b8' }}>Loading dataset...</h3>;

  const cardStyle = { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
  const inputStyle = { padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', marginRight: '0.5rem', marginBottom: '1rem' };
  const buttonStyle = { padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* TOP ROW: Compute & Table */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Compute Panel */}
        <div style={{ ...cardStyle, flex: 1, minWidth: '300px' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>Run Computation</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <select value={statCol} onChange={e => setStatCol(e.target.value)} style={inputStyle}>
              <option value="">-- Select Numeric Column --</option>
              {previewData.columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <select value={operation} onChange={e => setOperation(e.target.value)} style={inputStyle}>
              <option value="sum">Sum</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
              <option value="mexwf">Custom Algo (mexwf)</option>
            </select>
            
            <button onClick={handleCompute} style={{ ...buttonStyle, backgroundColor: '#8b5cf6' }}>
              Calculate
            </button>

            {statResult !== null && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '4px', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'white' }}>Result: {statResult}</h3>
                <span style={{ color: isCached ? '#fbbf24' : '#94a3b8', fontSize: '0.85rem' }}>
                  {isCached ? '⚡ Loaded from Cache' : '🔄 Calculated from disk'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Data Preview Table */}
        <div style={{ ...cardStyle, flex: 2, minWidth: '400px', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>Data Preview (Top 25 rows)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a' }}>
                {previewData.columns.map(col => (
                  <th key={col} style={{ padding: '0.5rem', border: '1px solid #334155' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.rows.map((row, idx) => (
                <tr key={idx}>
                  {previewData.columns.map(col => (
                    <td key={col} style={{ padding: '0.5rem', border: '1px solid #334155' }}>{row[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM ROW: The Apache ECharts Visualization calling the /plot endpoint */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>Data Visualization</h3>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <select value={xAxisCol} onChange={e => setXAxisCol(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
            <option value="">-- X-Axis Column --</option>
            {previewData.columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={yAxisCol} onChange={e => setYAxisCol(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
            <option value="">-- Y-Axis Column --</option>
            {previewData.columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={plotType} onChange={e => handlePlotTypeChange(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
            <option value="bar">Bar Plot</option>
            <option value="line">Line Plot</option>
            <option value="scatter">Scatter Plot</option>
          </select>

          <select value={plotAgg} onChange={e => setPlotAgg(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
            <option value="sum">Sum of Y per X</option>
            <option value="mean">Average of Y per X</option>
            <option value="count">Count of rows per X</option>
            <option value="none">Raw points (sampled)</option>
          </select>

          <button onClick={handleFetchPlot} style={buttonStyle} disabled={isPlotLoading}>
            {isPlotLoading ? 'Loading...' : 'Generate Plot'}
          </button>
        </div>

        {/* ECharts Rendering Area */}
        {plotData ? (
          <div style={{ width: '100%', height: '400px', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '4px' }}>
            <ReactECharts 
              option={getChartOptions()} 
              style={{ height: '100%', width: '100%' }} 
              notMerge={true} 
            />
          </div>
        ) : (
          <p style={{ color: '#94a3b8' }}>Select axes and click "Generate Plot" to fetch data from the server.</p>
        )}
      </div>

    </div>
  );
}