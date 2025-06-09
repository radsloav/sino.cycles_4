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

// Timeframe definitions with real astronomical data
const TIMEFRAMES = [
  {
    name: 'Great Year',
    periodDays: 25920 * 365.2422,
    phase0: '2000-03-21T00:00:00Z', // Vernal Equinox 2000
    strokeMain: 6,
    quadrantRatios: [6480, 6480, 6480, 6480], // years
    editable: false
  },
  {
    name: 'Solar Year', 
    periodDays: 365.2422,
    phase0: '2025-03-21T00:00:00Z', // Vernal Equinox 2025 (21 March to 21 March)
    strokeMain: 4,
    quadrantRatios: [93, 92, 89, 91], // days (Spring, Summer, Autumn, Winter)
    editable: true
  },
  {
    name: 'Quarter',
    periodDays: 91.31,  // Average quarter (365.24/4)
    phase0: '2025-03-21T00:00:00Z', // Spring equinox
    strokeMain: 3.5,
    quadrantRatios: [23, 23, 23, 22], // days
    editable: true
  },
  {
    name: 'Lunar Month',
    periodDays: 29.530589,
    phase0: '2025-03-16T17:10:00Z', // First Quarter March 2025
    strokeMain: 3,
    quadrantRatios: [7.38, 7.38, 7.38, 7.38], // days
    editable: true
  },
  {
    name: 'Mercury Synodic',
    periodDays: 115.88, // Mercury synodic period
    phase0: '2025-01-15T00:00:00Z', // Superior conjunction
    strokeMain: 2.8,
    quadrantRatios: [29, 29, 29, 28], // days
    editable: true
  },
  {
    name: 'Venus Synodic',
    periodDays: 583.92, // Venus synodic period
    phase0: '2025-01-10T00:00:00Z', // Superior conjunction
    strokeMain: 3.2,
    quadrantRatios: [146, 146, 146, 145], // days
    editable: true
  },
  {
    name: 'Solar Day',
    periodDays: 1.0,
    phase0: '2025-01-01T06:00:00Z', // Sunrise epoch
    strokeMain: 2,
    quadrantRatios: [6, 6, 6, 6], // hours
    editable: true
  }
];

// Settings Modal Component
const SettingsModal = ({ isOpen, onClose, availableCycles, selectedCycles, onCycleToggle, onCreateCustom }) => {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings ⚙</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <h3>Visible Cycles</h3>
          <div className="cycles-list">
            {availableCycles.map(cycle => (
              <div key={cycle.name} className="cycle-item">
                <input
                  type="checkbox"
                  id={cycle.name}
                  checked={selectedCycles.includes(cycle.name)}
                  onChange={() => onCycleToggle(cycle.name)}
                />
                <label htmlFor={cycle.name}>
                  <span className="cycle-name">{cycle.name}</span>
                  <span className="cycle-period">({cycle.periodDays.toFixed(1)} days)</span>
                </label>
              </div>
            ))}
          </div>
          
          <button className="create-custom-btn" onClick={onCreateCustom}>
            + Create Custom Cycle
          </button>
        </div>
      </div>
    </div>
  );
};

// Real astronomical Wave Renderer Component
const RealWaveCanvas = ({ 
  activeTimeframe, 
  currentDate, 
  translateX, 
  selectedCycles,
  onDrag, 
  onTap, 
  onLongPress,
  onDateChange,
  onDoubleClick 
}) => {
  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, time: 0 });
  const longPressTimer = useRef(null);
  const [verticalCursor, setVerticalCursor] = useState(null);

  const CANVAS_PX = 1460; // Android reference width
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 400;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  
  // Aspect colors (M-R-G-B for 0°-90°-180°-270°)
  const ASPECT_COLORS = ['#FF0080', '#FF4444', '#00FF44', '#0080FF'];

  // Get active timeframe data
  const getActiveTimeframe = () => {
    return TIMEFRAMES.find(tf => tf.name === activeTimeframe) || TIMEFRAMES[1];
  };

  // Convert date to pixel position within timeframe
  const dateToPixel = (date, timeframe) => {
    const phase0 = new Date(timeframe.phase0);
    const deltaMs = date.getTime() - phase0.getTime();
    const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
    
    // Handle cycling (positive and negative time)
    let normalizedDelta = deltaMs;
    if (deltaMs < 0) {
      const cyclesBefore = Math.ceil(Math.abs(deltaMs) / periodMs);
      normalizedDelta = deltaMs + (cyclesBefore * periodMs);
    }
    
    const cycleProgress = (normalizedDelta % periodMs) / periodMs;
    return cycleProgress * CANVAS_PX;
  };

  // Convert pixel to date
  const pixelToDate = (pixel, timeframe) => {
    const phase0 = new Date(timeframe.phase0);
    const cycleProgress = pixel / CANVAS_PX;
    const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
    const deltaMs = cycleProgress * periodMs;
    
    return new Date(phase0.getTime() + deltaMs);
  };

  // Calculate current visible date based on center position
  const getCurrentVisibleDate = () => {
    const timeframe = getActiveTimeframe();
    const centerPixel = translateX + (CANVAS_WIDTH / 2);
    return pixelToDate(centerPixel, timeframe);
  };

  // Draw quarter-arc wave with proper quadrant ratios
  const drawQuarterArcWave = () => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous content
    svg.innerHTML = '';
    
    const timeframe = getActiveTimeframe();

    // Create glow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'aspectGlow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('in', 'SourceGraphic');
    feGaussianBlur.setAttribute('stdDeviation', '3');
    
    filter.appendChild(feGaussianBlur);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Draw center axis line
    const centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    centerLine.setAttribute('x1', 0);
    centerLine.setAttribute('y1', CENTER_Y);
    centerLine.setAttribute('x2', CANVAS_WIDTH);
    centerLine.setAttribute('y2', CENTER_Y);
    centerLine.setAttribute('stroke', '#CCCCCC');
    centerLine.setAttribute('stroke-width', '1');
    centerLine.setAttribute('stroke-dasharray', '5,5');
    svg.appendChild(centerLine);

    // Calculate visible cycles
    const viewStartPixel = translateX;
    const viewEndPixel = translateX + CANVAS_WIDTH;
    const cyclesToDraw = Math.ceil(CANVAS_WIDTH / CANVAS_PX) + 2;
    const startCycle = Math.floor(viewStartPixel / CANVAS_PX) - 1;
    
    // Draw main timeframe wave(s)
    for (let cycleIndex = startCycle; cycleIndex < startCycle + cyclesToDraw; cycleIndex++) {
      const cycleOffsetX = cycleIndex * CANVAS_PX;
      drawMainWave(svg, timeframe, cycleOffsetX - translateX, true);
    }

    // Draw nested shorter cycles
    drawNestedWaves(svg, timeframe);

    // Draw current date indicator
    drawCurrentTimeIndicator(svg, timeframe);

    // Draw vertical cursor if active
    drawVerticalCursor(svg);

    // Update current visible date
    const visibleDate = getCurrentVisibleDate();
    onDateChange && onDateChange(visibleDate);
  };

  // Draw single main wave using quarter-arcs with quadrant ratios
  const drawMainWave = (svg, timeframe, offsetX, isMain = false) => {
    const totalRatio = timeframe.quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    let currentX = offsetX;

    // Track key aspect positions for correct placement
    const aspectPositions = [];

    for (let quarter = 0; quarter < 4; quarter++) {
      const ratio = timeframe.quadrantRatios[quarter];
      const quarterWidth = (ratio / totalRatio) * CANVAS_PX;
      const radius = quarterWidth / 2;
      const endX = currentX + quarterWidth;

      // Skip if not visible
      if (endX < -50 || currentX > CANVAS_WIDTH + 50) {
        currentX = endX;
        continue;
      }

      const centerX = currentX + radius;

      // Create quarter arc path
      let pathData;
      if (quarter === 0 || quarter === 2) {
        // Upper arcs (0-90°, 180-270°)
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 1 ${endX} ${CENTER_Y}`;
      } else {
        // Lower arcs (90-180°, 270-360°)
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 0 ${endX} ${CENTER_Y}`;
      }

      // Draw the wave segment (grey)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', '#999999');
      path.setAttribute('stroke-width', isMain ? timeframe.strokeMain : timeframe.strokeMain * 0.6);
      path.setAttribute('fill', 'none');
      svg.appendChild(path);

      // Store correct aspect positions
      if (quarter === 0) {
        // Magenta (0°) - start of wave
        aspectPositions.push({ x: currentX, y: CENTER_Y, color: ASPECT_COLORS[0] });
      } else if (quarter === 1) {
        // Red (90°) - peak of first upper arc
        aspectPositions.push({ x: centerX, y: CENTER_Y - radius, color: ASPECT_COLORS[1] });
      } else if (quarter === 2) {
        // Green (180°) - crossing center line
        aspectPositions.push({ x: currentX, y: CENTER_Y, color: ASPECT_COLORS[2] });
      } else if (quarter === 3) {
        // Blue (270°) - bottom of lower arc
        aspectPositions.push({ x: centerX, y: CENTER_Y + radius, color: ASPECT_COLORS[3] });
      }

      currentX = endX;
    }

    // Add final Magenta (360°) - end of wave
    aspectPositions.push({ x: currentX, y: CENTER_Y, color: ASPECT_COLORS[0] });

    // Draw all aspect points at correct positions
    aspectPositions.forEach(aspect => {
      drawAspectPoint(svg, aspect.x, aspect.y, aspect.color, isMain);
    });
  };

  // Draw aspect point (colored circle)
  const drawAspectPoint = (svg, x, y, color, isMain) => {
    if (x < -20 || x > CANVAS_WIDTH + 20) return;
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', isMain ? '6' : '4');
    circle.setAttribute('fill', color);
    circle.setAttribute('filter', 'url(#aspectGlow)');
    svg.appendChild(circle);
  };

  // Draw nested shorter cycles
  const drawNestedWaves = (svg, mainTimeframe) => {
    // Only draw cycles that are selected and shorter than main timeframe
    const shorterTFs = TIMEFRAMES.filter(tf => 
      tf.periodDays < mainTimeframe.periodDays && 
      tf.name !== mainTimeframe.name &&
      selectedCycles.includes(tf.name)
    );

    shorterTFs.forEach((nestedTF, index) => {
      // Calculate how many nested cycles fit in the main cycle
      const cyclesPerMain = mainTimeframe.periodDays / nestedTF.periodDays;
      const nestedCyclePx = CANVAS_PX / cyclesPerMain;

      if (nestedCyclePx < 20) return; // Skip if too small to render

      // Calculate stroke width (logarithmic scaling)
      const strokeScale = Math.pow(nestedTF.periodDays / mainTimeframe.periodDays, 0.7);
      const scaledStroke = Math.max(0.5, nestedTF.strokeMain * strokeScale);

      // Draw multiple nested cycles aligned to their real phase-0
      const phase0Main = new Date(mainTimeframe.phase0);
      const phase0Nested = new Date(nestedTF.phase0);
      
      // Calculate offset based on real phase difference
      const phaseDelta = (phase0Nested.getTime() - phase0Main.getTime()) / (1000 * 60 * 60 * 24);
      const phaseOffsetPx = (phaseDelta / mainTimeframe.periodDays) * CANVAS_PX;

      const viewStartPixel = translateX;
      const viewEndPixel = translateX + CANVAS_WIDTH;
      const nestedCyclesToDraw = Math.ceil(CANVAS_WIDTH / nestedCyclePx) + 2;
      const startNestedCycle = Math.floor((viewStartPixel - phaseOffsetPx) / nestedCyclePx) - 1;

      for (let cycleIndex = startNestedCycle; cycleIndex < startNestedCycle + nestedCyclesToDraw; cycleIndex++) {
        const cycleOffsetX = phaseOffsetPx + (cycleIndex * nestedCyclePx);
        
        drawScaledWave(svg, nestedTF, cycleOffsetX - translateX, nestedCyclePx, scaledStroke, index);
      }
    });
  };

  // Draw scaled nested wave - oscillating around center baseline
  const drawScaledWave = (svg, timeframe, offsetX, scalePx, strokeWidth, nestLevel) => {
    const totalRatio = timeframe.quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    let currentX = offsetX;
    
    // All nested waves oscillate around center baseline (no vertical offset)
    const waveAmplitude = Math.max(15, 40 - (nestLevel * 10)); // Smaller amplitude for nested waves

    for (let quarter = 0; quarter < 4; quarter++) {
      const ratio = timeframe.quadrantRatios[quarter];
      const quarterWidth = (ratio / totalRatio) * scalePx;
      const radius = quarterWidth / 2;
      const endX = currentX + quarterWidth;

      if (endX < -50 || currentX > CANVAS_WIDTH + 50) {
        currentX = endX;
        continue;
      }

      // Create scaled arc around center baseline
      let pathData;
      if (quarter === 0 || quarter === 2) {
        // Upper arcs - reduced amplitude
        const arcRadius = Math.min(radius, waveAmplitude);
        pathData = `M ${currentX} ${CENTER_Y} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${CENTER_Y}`;
      } else {
        // Lower arcs - reduced amplitude  
        const arcRadius = Math.min(radius, waveAmplitude);
        pathData = `M ${currentX} ${CENTER_Y} A ${arcRadius} ${arcRadius} 0 0 0 ${endX} ${CENTER_Y}`;
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', '#BBBBBB');
      path.setAttribute('stroke-width', strokeWidth);
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.6');
      svg.appendChild(path);

      currentX = endX;
    }
  };

  // Draw current time indicator
  const drawCurrentTimeIndicator = (svg, timeframe) => {
    if (!currentDate) return;

    const currentPixel = dateToPixel(currentDate, timeframe) - translateX;
    
    // Handle cycling - show indicator if within visible area
    const visiblePositions = [];
    for (let cycle = -1; cycle <= 2; cycle++) {
      const pos = currentPixel + (cycle * CANVAS_PX);
      if (pos >= -10 && pos <= CANVAS_WIDTH + 10) {
        visiblePositions.push(pos);
      }
    }

    visiblePositions.forEach(indicatorX => {
      // Current time line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', indicatorX);
      line.setAttribute('y1', 50);
      line.setAttribute('x2', indicatorX);
      line.setAttribute('y2', CANVAS_HEIGHT - 50);
      line.setAttribute('stroke', '#FF6B35');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('filter', 'url(#aspectGlow)');
      svg.appendChild(line);
      
      // Current time dot
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', indicatorX);
      dot.setAttribute('cy', CENTER_Y);
      dot.setAttribute('r', '8');
      dot.setAttribute('fill', '#FF6B35');
      dot.setAttribute('stroke', '#FFFFFF');
      dot.setAttribute('stroke-width', '2');
      dot.setAttribute('filter', 'url(#aspectGlow)');
      svg.appendChild(dot);
    });
  };

  useEffect(() => {
    drawQuarterArcWave();
  }, [activeTimeframe, currentDate, translateX]);

  // Touch/Mouse handlers with double-click support
  const handleStart = (e) => {
    isDragging.current = true;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    dragStart.current = { x: clientX, time: Date.now() };
    
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
    
    const duration = Date.now() - dragStart.current.time;
    if (duration < 200) {
      const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
      onTap && onTap(clientX);
    }
  };

  const handleDoubleClick = (e) => {
    const clientX = e.clientX;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = clientX - rect.left;
    
    setVerticalCursor(svgX);
    onDoubleClick && onDoubleClick(svgX);
  };

  // Draw vertical cursor
  const drawVerticalCursor = (svg) => {
    if (verticalCursor === null) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', verticalCursor);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', verticalCursor);
    line.setAttribute('y2', CANVAS_HEIGHT);
    line.setAttribute('stroke', '#FF6B35');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-dasharray', '10,5');
    line.setAttribute('filter', 'url(#aspectGlow)');
    svg.appendChild(line);

    // Cursor handle
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', verticalCursor);
    handle.setAttribute('cy', 20);
    handle.setAttribute('r', '8');
    handle.setAttribute('fill', '#FF6B35');
    handle.setAttribute('stroke', '#FFFFFF');
    handle.setAttribute('stroke-width', '2');
    handle.setAttribute('style', 'cursor: ew-resize;');
    svg.appendChild(handle);
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
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );
};

// Real Timeline Axis Component
const RealTimelineAxis = ({ activeTimeframe, currentVisibleDate, translateX }) => {
  const getTimeframe = () => {
    return TIMEFRAMES.find(tf => tf.name === activeTimeframe) || TIMEFRAMES[1];
  };

  const generateRealTimeMarkers = () => {
    const timeframe = getTimeframe();
    const markers = [];
    const CANVAS_PX = 1460;
    
    // Generate markers based on timeframe
    if (activeTimeframe === 'Solar Year') {
      // Show months from March to March (following solar year)
      const startDate = new Date(timeframe.phase0);
      
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(startDate.getMonth() + month);
        
        // Calculate pixel position based on actual date
        const phase0 = new Date(timeframe.phase0);
        const deltaMs = monthDate.getTime() - phase0.getTime();
        const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
        const progress = (deltaMs % periodMs) / periodMs;
        
        markers.push({
          type: 'month',
          date: monthDate,
          pixel: progress * CANVAS_PX,
          label: monthDate.toLocaleDateString('en', { month: 'short' }).toLowerCase()
        });
      }
    }
    
    return markers;
  };

  const markers = generateRealTimeMarkers();

  return (
    <div className="timeline-axis">
      <div className="timeline-track">
        {markers.map((marker, index) => (
          <div
            key={index}
            className={`timeline-marker timeline-${marker.type}`}
            style={{ left: `${marker.pixel - translateX + 100}px` }}
          >
            <div className="marker-tick"></div>
            <div className="marker-label">{marker.label}</div>
          </div>
        ))}
        
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
        <div className="btn-icon wave-icon">S</div>
      </button>
      
      <button className="sidebar-btn profile-btn" onClick={onProfile}>
        <div className="btn-icon">👤</div>
      </button>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTimeframe, setActiveTimeframe] = useState('Solar Year');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentVisibleDate, setCurrentVisibleDate] = useState(new Date());
  const [translateX, setTranslateX] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCycles, setSelectedCycles] = useState(['Lunar Month', 'Solar Day']); // Default nested cycles

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleCycleToggle = (cycleName) => {
    setSelectedCycles(prev => 
      prev.includes(cycleName) 
        ? prev.filter(name => name !== cycleName)
        : [...prev, cycleName]
    );
  };

  const handleTimeFrameChange = (newTimeFrame) => {
    setActiveTimeframe(newTimeFrame);
    setTranslateX(0);
  };

  const handleDrag = (deltaX) => {
    setTranslateX(prev => prev - deltaX); // Allow negative for past navigation
  };

  const handleArrowJump = (direction) => {
    const CYCLE_PX = 1460;
    setTranslateX(prev => prev + (direction * CYCLE_PX));
  };

  const handleDateChange = (newDate) => {
    setCurrentVisibleDate(newDate);
  };

  const handleDoubleClick = (svgX) => {
    // Calculate date at cursor position
    const timeframe = TIMEFRAMES.find(tf => tf.name === activeTimeframe);
    if (timeframe) {
      const cursorPixel = translateX + svgX;
      const phase0 = new Date(timeframe.phase0);
      const cycleProgress = (cursorPixel % 1460) / 1460;
      const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
      const deltaMs = cycleProgress * periodMs;
      const cursorDate = new Date(phase0.getTime() + deltaMs);
      setCurrentVisibleDate(cursorDate);
    }
  };

  const formatVisibleDate = () => {
    return currentVisibleDate.toLocaleDateString('sk-SK', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatVisibleTime = () => {
    return currentVisibleDate.toLocaleTimeString('sk-SK', { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get available cycles for settings (shorter than active timeframe)
  const getAvailableCycles = () => {
    const activeTimeframePeriod = TIMEFRAMES.find(tf => tf.name === activeTimeframe)?.periodDays || 365;
    return TIMEFRAMES.filter(tf => tf.periodDays < activeTimeframePeriod && tf.name !== activeTimeframe);
  };

  return (
    <div className="App">
      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        availableCycles={getAvailableCycles()}
        selectedCycles={selectedCycles}
        onCycleToggle={handleCycleToggle}
        onCreateCustom={() => console.log('Create custom cycle')}
      />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="date-badge">{formatVisibleDate()}</span>
          <span className="time-badge">{formatVisibleTime()}</span>
        </div>
        
        <SiNoLogo />
        
        <div className="header-right">
          <div className="moon-phase">🌓</div>
          <select 
            className="timeframe-select"
            value={activeTimeframe}
            onChange={(e) => handleTimeFrameChange(e.target.value)}
          >
            {TIMEFRAMES.map(tf => (
              <option key={tf.name} value={tf.name}>
                {tf.name}
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
            title="Previous cycle"
          >
            ◁
          </button>
          
          <RealWaveCanvas
            activeTimeframe={activeTimeframe}
            currentDate={currentDate}
            translateX={translateX}
            selectedCycles={selectedCycles}
            onDrag={handleDrag}
            onDateChange={handleDateChange}
            onDoubleClick={handleDoubleClick}
            onTap={(x) => console.log('Tap at:', x)}
            onLongPress={(x) => console.log('Long press at:', x)}
          />
          
          <button 
            className="nav-arrow nav-right"
            onClick={() => handleArrowJump(1)}
            title="Next cycle"
          >
            ▷
          </button>
        </div>
        
        <RealTimelineAxis
          activeTimeframe={activeTimeframe}
          currentVisibleDate={currentVisibleDate}
          translateX={translateX}
        />
      </main>

      {/* Right Sidebar */}
      <RightSidebar
        onSettings={() => setShowSettings(true)}
        onProfile={() => console.log('Profile')}
      />
    </div>
  );
}

export default App;