import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SiNo Logo Component
const SiNoLogo = () => (
  <div className="sino-logo">
    <span className="logo-s">S</span>
    <div className="logo-wave">~</div>
    <span className="logo-no">iNo</span>
  </div>
);

// Quarter-Arc Wave Renderer Component
const WaveCanvas = ({ cycles, activeCycle, currentDate, translateX, onDrag, onTap, onLongPress }) => {
  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, time: 0 });
  const longPressTimer = useRef(null);

  const CYCLE_PX = 1460;
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 400;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  
  // Quadrant colors (M-R-G-B)
  const QUADRANT_COLORS = ['#FF0080', '#FF4444', '#00FF44', '#0080FF'];

  // Calculate current timeframe epoch and period
  const getActiveTimeframe = () => {
    const active = cycles.find(c => c.name === activeCycle);
    if (!active) return null;
    
    return {
      epoch: new Date(active.epoch),
      periodDays: active.period_days,
      quadrantRatios: active.quadrant_ratios,
      color: active.color,
      name: active.name
    };
  };

  // Convert date to pixel position
  const dateToPixel = (date, timeframe) => {
    if (!timeframe) return 0;
    
    const deltaMs = date.getTime() - timeframe.epoch.getTime();
    const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
    
    // Handle negative dates (before epoch)
    const normalizedDelta = deltaMs >= 0 ? deltaMs : deltaMs + Math.ceil(Math.abs(deltaMs) / periodMs) * periodMs;
    const cycleProgress = (normalizedDelta % periodMs) / periodMs;
    
    return cycleProgress * CYCLE_PX;
  };

  // Convert pixel to date
  const pixelToDate = (pixel, timeframe) => {
    if (!timeframe) return new Date();
    
    const cycleProgress = pixel / CYCLE_PX;
    const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
    const deltaMs = cycleProgress * periodMs;
    
    return new Date(timeframe.epoch.getTime() + deltaMs);
  };

  // Draw quarter-arc wave
  const drawQuarterArcWave = () => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous content
    svg.innerHTML = '';

    const timeframe = getActiveTimeframe();
    if (!timeframe) return;

    // Create SVG defs for glow effects
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Create glow filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    const feMorphology = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
    feMorphology.setAttribute('operator', 'dilate');
    feMorphology.setAttribute('radius', '2');
    feMorphology.setAttribute('in', 'SourceGraphic');
    feMorphology.setAttribute('result', 'thicken');
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('in', 'thicken');
    feGaussianBlur.setAttribute('stdDeviation', '3');
    feGaussianBlur.setAttribute('result', 'colored');
    
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'colored');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    
    filter.appendChild(feMorphology);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Calculate visible cycles based on current position and translation
    const viewStartPixel = translateX;
    const viewEndPixel = translateX + CANVAS_WIDTH;
    
    // Draw multiple complete cycles to ensure continuous view
    const cyclesToDraw = Math.ceil(CANVAS_WIDTH / CYCLE_PX) + 2;
    const startCycle = Math.floor(viewStartPixel / CYCLE_PX) - 1;
    
    for (let cycleIndex = startCycle; cycleIndex < startCycle + cyclesToDraw; cycleIndex++) {
      const cycleOffsetX = cycleIndex * CYCLE_PX;
      drawSingleCycle(svg, timeframe, cycleOffsetX - translateX);
    }

    // Draw current time indicator
    if (currentDate) {
      const currentPixel = dateToPixel(currentDate, timeframe) - translateX;
      const indicatorX = currentPixel % CYCLE_PX;
      
      if (indicatorX >= 0 && indicatorX <= CANVAS_WIDTH) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', indicatorX);
        line.setAttribute('y1', 50);
        line.setAttribute('x2', indicatorX);
        line.setAttribute('y2', CANVAS_HEIGHT - 50);
        line.setAttribute('stroke', '#FFFFFF');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('filter', 'url(#glow)');
        svg.appendChild(line);
        
        // Current time dot
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', indicatorX);
        dot.setAttribute('cy', CENTER_Y);
        dot.setAttribute('r', '6');
        dot.setAttribute('fill', '#FFFFFF');
        dot.setAttribute('filter', 'url(#glow)');
        svg.appendChild(dot);
      }
    }
  };

  // Draw single cycle using quarter-arcs
  const drawSingleCycle = (svg, timeframe, offsetX) => {
    const quarterWidth = CYCLE_PX / 4; // 365px per quarter
    const radius = quarterWidth / 2; // 182.5px radius
    
    // Draw each quarter as an arc
    for (let quarter = 0; quarter < 4; quarter++) {
      const startX = offsetX + (quarter * quarterWidth);
      const endX = startX + quarterWidth;
      
      // Skip if not visible
      if (endX < 0 || startX > CANVAS_WIDTH) continue;
      
      const centerX = startX + radius;
      const color = QUADRANT_COLORS[quarter];
      
      // Create quarter arc path
      let pathData;
      if (quarter === 0 || quarter === 2) {
        // Upper arcs (0-90°, 180-270°)
        pathData = `M ${startX} ${CENTER_Y} A ${radius} ${radius} 0 0 1 ${endX} ${CENTER_Y}`;
      } else {
        // Lower arcs (90-180°, 270-360°) 
        pathData = `M ${startX} ${CENTER_Y} A ${radius} ${radius} 0 0 0 ${endX} ${CENTER_Y}`;
      }
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', timeframe.name === activeCycle ? '4' : '2');
      path.setAttribute('fill', 'none');
      path.setAttribute('filter', 'url(#glow)');
      svg.appendChild(path);
      
      // Add quadrant marker dots
      const markerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      markerDot.setAttribute('cx', quarter === 1 || quarter === 3 ? centerX : startX);
      markerDot.setAttribute('cy', quarter === 0 || quarter === 2 ? CENTER_Y - radius : CENTER_Y + radius);
      markerDot.setAttribute('r', '4');
      markerDot.setAttribute('fill', color);
      markerDot.setAttribute('filter', 'url(#glow)');
      svg.appendChild(markerDot);
    }
  };

  useEffect(() => {
    drawQuarterArcWave();
  }, [cycles, activeCycle, currentDate, translateX]);

  // Touch/Mouse handlers
  const handleStart = (e) => {
    isDragging.current = true;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    dragStart.current = { x: clientX, time: Date.now() };
    
    // Long press detection
    longPressTimer.current = setTimeout(() => {
      if (isDragging.current) {
        onLongPress && onLongPress(clientX);
      }
    }, 1500);
  };

  const handleMove = (e) => {
    if (!isDragging.current) return;
    
    e.preventDefault();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStart.current.x;
    
    onDrag && onDrag(deltaX);
    dragStart.current.x = clientX;
  };

  const handleEnd = (e) => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    clearTimeout(longPressTimer.current);
    
    // Check for tap (short duration, small movement)
    const duration = Date.now() - dragStart.current.time;
    if (duration < 200) {
      const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
      onTap && onTap(clientX);
    }
  };

  return (
    <div className="wave-container">
      <svg
        ref={svgRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="wave-svg"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );
};

// Timeline Axis Component
const TimelineAxis = ({ activeCycle, currentDate, translateX, cycles }) => {
  const getActiveTimeframe = () => {
    return cycles.find(c => c.name === activeCycle);
  };

  const generateTimeMarkers = () => {
    const timeframe = getActiveTimeframe();
    if (!timeframe) return [];

    const markers = [];
    const CYCLE_PX = 1460;
    const epoch = new Date(timeframe.epoch);
    
    // For Solar Year - show months
    if (activeCycle === 'Solar Year') {
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(epoch.getFullYear(), epoch.getMonth() + month, 1);
        const pixelPos = (month / 12) * CYCLE_PX;
        
        markers.push({
          type: 'month',
          date: monthDate,
          pixel: pixelPos,
          label: monthDate.toLocaleDateString('en', { month: 'short' }).toLowerCase()
        });
      }
    }
    
    return markers;
  };

  const markers = generateTimeMarkers();

  return (
    <div className="timeline-axis">
      <div className="timeline-track">
        {markers.map((marker, index) => (
          <div
            key={index}
            className={`timeline-marker timeline-${marker.type}`}
            style={{ left: `${marker.pixel - translateX}px` }}
          >
            <div className="marker-tick"></div>
            <div className="marker-label">{marker.label}</div>
          </div>
        ))}
        
        {/* Year indicators */}
        <div className="year-indicators">
          <span className="year-label">{'< 2025'}</span>
          <span className="year-label current">{'2026 >'}</span>
        </div>
      </div>
    </div>
  );
};

// Right Sidebar Component
const RightSidebar = ({ onSettings, onProfile }) => {
  return (
    <div className="right-sidebar">
      <button className="sidebar-btn settings-btn" onClick={onSettings}>
        <div className="btn-icon">⚙</div>
      </button>
      
      <button className="sidebar-btn wave-btn">
        <div className="btn-icon wave-icon">
          <div className="wave-line"></div>
          <div className="wave-line"></div>
          <div className="wave-line"></div>
        </div>
      </button>
      
      <button className="sidebar-btn profile-btn" onClick={onProfile}>
        <div className="btn-icon">👤</div>
      </button>
    </div>
  );
};

// Main App Component
function App() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState('Solar Year');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [translateX, setTranslateX] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCycles();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadCycles = async () => {
    try {
      const response = await fetch(`${API}/cycles`);
      const cyclesData = await response.json();
      setCycles(cyclesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading cycles:', error);
      setLoading(false);
    }
  };

  const handleTimeFrameChange = (newTimeFrame) => {
    setActiveCycle(newTimeFrame);
    setTranslateX(0); // Reset position when changing timeframe
  };

  const handleDrag = (deltaX) => {
    setTranslateX(prev => Math.max(0, prev - deltaX)); // Prevent negative scroll
  };

  const handleArrowJump = (direction) => {
    const CYCLE_PX = 1460;
    setTranslateX(prev => Math.max(0, prev + (direction * CYCLE_PX)));
  };

  const handleTap = (clientX) => {
    // TODO: Show tooltip with date and phase info
    console.log('Tap at:', clientX);
  };

  const handleLongPress = (clientX) => {
    // TODO: Show vertical slider for precise navigation
    console.log('Long press at:', clientX);
  };

  const formatDate = () => {
    return currentDate.toLocaleDateString('sk-SK', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = () => {
    return currentDate.toLocaleTimeString('sk-SK', { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <SiNoLogo />
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="date-badge">{formatDate()}</span>
          <span className="time-badge">{formatTime()}</span>
        </div>
        
        <SiNoLogo />
        
        <div className="header-right">
          <div className="moon-phase">🌓</div>
          <select 
            className="timeframe-select"
            value={activeCycle}
            onChange={(e) => handleTimeFrameChange(e.target.value)}
          >
            {cycles.map(cycle => (
              <option key={cycle.name} value={cycle.name}>
                {cycle.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="canvas-area">
          <button 
            className="nav-arrow nav-left"
            onClick={() => handleArrowJump(-1)}
          >
            ◁
          </button>
          
          <WaveCanvas
            cycles={cycles}
            activeCycle={activeCycle}
            currentDate={currentDate}
            translateX={translateX}
            onDrag={handleDrag}
            onTap={handleTap}
            onLongPress={handleLongPress}
          />
          
          <button 
            className="nav-arrow nav-right"
            onClick={() => handleArrowJump(1)}
          >
            ▷
          </button>
        </div>
        
        <TimelineAxis
          activeCycle={activeCycle}
          currentDate={currentDate}
          translateX={translateX}
          cycles={cycles}
        />
      </main>

      {/* Right Sidebar */}
      <RightSidebar
        onSettings={() => console.log('Settings')}
        onProfile={() => console.log('Profile')}
      />
    </div>
  );
}

export default App;