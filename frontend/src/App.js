import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SiNo Logo Component
const SiNoLogo = () => (
  <div className="sino-logo">
    <span className="logo-text">SiNo</span>
    <div className="logo-wave">~</div>
  </div>
);

// Wave Renderer Component
const WaveCanvas = ({ cycles, activeCycle, currentTime, translateX, onDrag }) => {
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const cyclePx = 1460;
  const canvasHeight = 400;
  
  // Color mapping for quadrants
  const quadrantColors = ['#FF0080', '#FF4444', '#00FF44', '#0080FF']; // M-R-G-B

  useEffect(() => {
    drawWaves();
  }, [cycles, currentTime, translateX, activeCycle]);

  const drawWaves = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with grey background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Add glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
    
    const centerY = height / 2;
    const amplitude = 80;
    
    // Draw each cycle wave
    cycles.forEach((cycle, index) => {
      if (!cycle.visible) return;
      
      const isActive = cycle.name === activeCycle;
      const baseStroke = isActive ? cycle.base_stroke * 1.5 : cycle.base_stroke;
      
      ctx.beginPath();
      ctx.strokeStyle = cycle.color;
      ctx.lineWidth = baseStroke;
      ctx.shadowColor = cycle.color;
      ctx.shadowBlur = isActive ? 30 : 15;
      
      // Calculate wave points
      const points = [];
      const numPoints = Math.ceil(width / 10);
      
      for (let i = 0; i <= numPoints; i++) {
        const x = (i * 10) - translateX;
        const normalizedX = x / cyclePx;
        
        // Calculate quadrant
        const quadrant = Math.floor((normalizedX % 1) * 4);
        const quadrantProgress = ((normalizedX % 1) * 4) % 1;
        
        // Create wave using quadrant ratios
        let y;
        if (quadrant === 0 || quadrant === 2) {
          // Upper arcs (0-180°, 360-540°)
          y = centerY - amplitude * Math.sin(quadrantProgress * Math.PI);
        } else {
          // Lower arcs (180-360°, 540-720°)
          y = centerY + amplitude * Math.sin(quadrantProgress * Math.PI);
        }
        
        points.push({ x: i * 10, y });
      }
      
      // Draw smooth curve through points
      if (points.length > 1) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const cp1x = (points[i].x + points[i-1].x) / 2;
          const cp1y = (points[i].y + points[i-1].y) / 2;
          const cp2x = (points[i].x + points[i+1].x) / 2;
          const cp2y = (points[i].y + points[i+1].y) / 2;
          
          ctx.quadraticCurveTo(cp1x, cp1y, (points[i].x + points[i+1].x) / 2, (points[i].y + points[i+1].y) / 2);
        }
      }
      
      ctx.stroke();
    });
    
    // Draw current time indicator
    if (currentTime) {
      const activeCycleData = cycles.find(c => c.name === activeCycle);
      if (activeCycleData && activeCycleData.currentPosition) {
        const indicatorX = activeCycleData.currentPosition.pixel_x - translateX + (width / 2);
        
        ctx.beginPath();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 10;
        ctx.moveTo(indicatorX, 50);
        ctx.lineTo(indicatorX, height - 50);
        ctx.stroke();
        
        // Draw indicator dot
        ctx.beginPath();
        ctx.fillStyle = '#FFFFFF';
        ctx.arc(indicatorX, centerY, 8, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    lastX.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    
    const deltaX = e.clientX - lastX.current;
    onDrag(deltaX);
    lastX.current = e.clientX;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={canvasHeight}
      className="wave-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

// Timeframe Picker Component
const TimeframePicker = ({ cycles, activeCycle, onCycleChange }) => {
  return (
    <div className="timeframe-picker">
      <select 
        value={activeCycle} 
        onChange={(e) => onCycleChange(e.target.value)}
        className="cycle-select"
      >
        {cycles.map(cycle => (
          <option key={cycle.name} value={cycle.name}>
            {cycle.name}
          </option>
        ))}
      </select>
    </div>
  );
};

// Layer Filter Component
const LayerFilter = ({ cycles, onToggleLayer }) => {
  return (
    <div className="layer-filter">
      <h3>Layers</h3>
      {cycles.map(cycle => (
        <div key={cycle.name} className="layer-item">
          <input
            type="checkbox"
            checked={cycle.visible}
            onChange={() => onToggleLayer(cycle.name)}
            id={`layer-${cycle.name}`}
          />
          <label htmlFor={`layer-${cycle.name}`} style={{color: cycle.color}}>
            {cycle.name}
          </label>
        </div>
      ))}
    </div>
  );
};

// Moon Phase Component
const MoonPhase = ({ phase }) => {
  const getMoonIcon = (phase) => {
    if (phase < 12.5) return '🌑'; // New Moon
    if (phase < 37.5) return '🌒'; // Waxing Crescent
    if (phase < 62.5) return '🌓'; // First Quarter
    if (phase < 87.5) return '🌔'; // Waxing Gibbous
    return '🌕'; // Full Moon
  };

  return (
    <div className="moon-phase">
      {getMoonIcon(phase)}
    </div>
  );
};

// Main App Component
function App() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState('Solar Year');
  const [currentTime, setCurrentTime] = useState(null);
  const [translateX, setTranslateX] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCycles();
    loadCurrentTime();
    
    // Update current time every minute
    const interval = setInterval(loadCurrentTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadCycles = async () => {
    try {
      const response = await fetch(`${API}/cycles`);
      const cyclesData = await response.json();
      
      // Initialize with visibility and limit to 6 cycles
      const initializedCycles = cyclesData.slice(0, 6).map((cycle, index) => ({
        ...cycle,
        visible: index < 6 // Show first 6 cycles
      }));
      
      setCycles(initializedCycles);
      setLoading(false);
    } catch (error) {
      console.error('Error loading cycles:', error);
      setLoading(false);
    }
  };

  const loadCurrentTime = async () => {
    try {
      const response = await fetch(`${API}/current_time`);
      const timeData = await response.json();
      setCurrentTime(timeData);
      
      // Update cycles with current positions
      setCycles(prevCycles => 
        prevCycles.map(cycle => ({
          ...cycle,
          currentPosition: timeData[cycle.name]
        }))
      );
    } catch (error) {
      console.error('Error loading current time:', error);
    }
  };

  const handleCycleChange = (cycleName) => {
    setActiveCycle(cycleName);
  };

  const handleDrag = (deltaX) => {
    setTranslateX(prev => prev - deltaX);
  };

  const handleToggleLayer = (cycleName) => {
    setCycles(prevCycles =>
      prevCycles.map(cycle =>
        cycle.name === cycleName
          ? { ...cycle, visible: !cycle.visible }
          : cycle
      )
    );
  };

  const jumpCycle = (direction) => {
    const cyclePx = 1460;
    setTranslateX(prev => prev + (direction * cyclePx));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <SiNoLogo />
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLunarPhase = () => {
    const lunarCycle = cycles.find(c => c.name === 'Lunar Month');
    return lunarCycle && lunarCycle.currentPosition 
      ? lunarCycle.currentPosition.phase_percent 
      : 0;
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="date-display">{formatDate()}</span>
          <span className="time-display">{formatTime()}</span>
        </div>
        
        <SiNoLogo />
        
        <div className="header-right">
          <MoonPhase phase={getLunarPhase()} />
          <TimeframePicker 
            cycles={cycles}
            activeCycle={activeCycle}
            onCycleChange={handleCycleChange}
          />
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="main-content">
        <div className="canvas-container">
          <button 
            className="nav-arrow nav-left"
            onClick={() => jumpCycle(-1)}
          >
            ◁
          </button>
          
          <WaveCanvas
            cycles={cycles}
            activeCycle={activeCycle}
            currentTime={currentTime}
            translateX={translateX}
            onDrag={handleDrag}
          />
          
          <button 
            className="nav-arrow nav-right"
            onClick={() => jumpCycle(1)}
          >
            ▷
          </button>
        </div>
        
        {/* Mini Timeline */}
        <div className="mini-timeline">
          <div className="timeline-ticks">
            {/* Timeline implementation would go here */}
          </div>
        </div>
      </main>

      {/* Right Rail */}
      <aside className="right-rail">
        <LayerFilter 
          cycles={cycles}
          onToggleLayer={handleToggleLayer}
        />
        
        <div className="controls-section">
          <h3>Sacred Modes</h3>
          <button className="mode-button">Resonance Radar</button>
          <button className="mode-button">Number Decoder</button>
          <button className="mode-button">Breath Sync</button>
        </div>
      </aside>
    </div>
  );
}

export default App;