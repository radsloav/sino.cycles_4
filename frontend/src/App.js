import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Timeframe definitions with real astronomical data
const TIMEFRAMES = [
  {
    name: 'Great Year',
    periodDays: 25920 * 365.2422,
    phase0: '2000-03-21T00:00:00Z',
    strokeMain: 6,
    quadrantRatios: [6480, 6480, 6480, 6480],
    editable: false
  },
  {
    name: 'Solar Year', 
    periodDays: 365.2422,
    phase0: '2025-03-21T00:00:00Z',
    strokeMain: 4,
    quadrantRatios: [93, 92, 89, 91],
    editable: true
  },
  {
    name: 'Quarter',
    periodDays: 91.31,
    phase0: '2025-03-21T00:00:00Z',
    strokeMain: 3.5,
    quadrantRatios: [23, 23, 23, 22],
    editable: true
  },
  {
    name: 'Lunar Month',
    periodDays: 29.530589,
    phase0: '2025-03-16T17:10:00Z',
    strokeMain: 3,
    quadrantRatios: [7.38, 7.38, 7.38, 7.38],
    editable: true
  },
  {
    name: 'Mercury Synodic',
    periodDays: 115.88,
    phase0: '2025-01-15T00:00:00Z',
    strokeMain: 2.8,
    quadrantRatios: [29, 29, 29, 28],
    editable: true
  },
  {
    name: 'Venus Synodic',
    periodDays: 583.92,
    phase0: '2025-01-10T00:00:00Z',
    strokeMain: 3.2,
    quadrantRatios: [146, 146, 146, 145],
    editable: true
  },
  {
    name: 'Solar Day',
    periodDays: 1.0,
    phase0: '2025-01-01T06:00:00Z',
    strokeMain: 2,
    quadrantRatios: [6, 6, 6, 6],
    editable: true
  }
];

// SiNo Logo Component
const SiNoLogo = () => (
  <div className="sino-logo">
    <span className="logo-s">S</span>
    <div className="logo-wave">~</div>
    <span className="logo-no">iNo</span>
  </div>
);

// Left Controls Panel
const LeftControlsPanel = ({ 
  displaySettings, 
  onToggleDisplay,
  isCollapsed,
  onToggleCollapse 
}) => {
  return (
    <div className={`left-controls ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="collapse-toggle"
        onClick={onToggleCollapse}
      >
        {isCollapsed ? '▶' : '◀'}
      </button>
      
      {!isCollapsed && (
        <div className="controls-content">
          <div className="control-group">
            <div className="control-item">
              <span className="control-label">lines</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={displaySettings.lines}
                  onChange={() => onToggleDisplay('lines')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="control-item">
              <span className="control-label">dashed date-time line</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={displaySettings.dashedDateTimeLine}
                  onChange={() => onToggleDisplay('dashedDateTimeLine')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="control-item">
              <span className="control-label">monthly dividers</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={displaySettings.monthlyDividers}
                  onChange={() => onToggleDisplay('monthlyDividers')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="control-item">
              <span className="control-label">edges</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={displaySettings.edges}
                  onChange={() => onToggleDisplay('edges')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="control-item">
              <span className="control-label">today line</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={displaySettings.todayLine}
                  onChange={() => onToggleDisplay('todayLine')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="control-item">
              <span className="control-label">main wave dividers</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={displaySettings.mainWaveDividers}
                  onChange={() => onToggleDisplay('mainWaveDividers')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="control-item">
              <span className="control-label">x line</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={displaySettings.xLine}
                  onChange={() => onToggleDisplay('xLine')}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Professional Wave Canvas Component
const ProfessionalWaveCanvas = ({ 
  activeTimeframe, 
  currentDate, 
  translateX, 
  selectedCycles,
  allTimeframes,
  displaySettings,
  onDrag, 
  onDateChange,
  onHover
}) => {
  const svgRef = useRef(null);
  const [mousePosition, setMousePosition] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0 });

  const CANVAS_PX = 1460;
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 400;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  
  // Professional aspect colors
  const ASPECT_COLORS = ['#FF0080', '#FF4444', '#00FF44', '#0080FF'];

  const getActiveTimeframe = () => {
    return allTimeframes?.find(tf => tf.name === activeTimeframe) || 
           TIMEFRAMES.find(tf => tf.name === activeTimeframe) || 
           TIMEFRAMES[1];
  };

  const dateToPixel = (date, timeframe) => {
    const phase0 = new Date(timeframe.phase0);
    const deltaMs = date.getTime() - phase0.getTime();
    const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
    
    let normalizedDelta = deltaMs;
    if (deltaMs < 0) {
      const cyclesBefore = Math.ceil(Math.abs(deltaMs) / periodMs);
      normalizedDelta = deltaMs + (cyclesBefore * periodMs);
    }
    
    const cycleProgress = (normalizedDelta % periodMs) / periodMs;
    return cycleProgress * CANVAS_PX;
  };

  const pixelToDate = (pixel, timeframe) => {
    const phase0 = new Date(timeframe.phase0);
    const cycleProgress = (pixel % CANVAS_PX) / CANVAS_PX;
    const periodMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
    const deltaMs = cycleProgress * periodMs;
    
    return new Date(phase0.getTime() + deltaMs);
  };

  // Draw professional quarter-arc wave
  const drawProfessionalWave = () => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.innerHTML = '';
    const timeframe = getActiveTimeframe();

    // Create professional glow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'professionalGlow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('in', 'SourceGraphic');
    feGaussianBlur.setAttribute('stdDeviation', '2');
    
    filter.appendChild(feGaussianBlur);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Draw center axis line (x line)
    if (displaySettings.xLine) {
      const centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      centerLine.setAttribute('x1', 0);
      centerLine.setAttribute('y1', CENTER_Y);
      centerLine.setAttribute('x2', CANVAS_WIDTH);
      centerLine.setAttribute('y2', CENTER_Y);
      centerLine.setAttribute('stroke', '#E0E0E0');
      centerLine.setAttribute('stroke-width', '1');
      centerLine.setAttribute('stroke-dasharray', '3,3');
      svg.appendChild(centerLine);
    }

    // Draw monthly dividers
    if (displaySettings.monthlyDividers && activeTimeframe === 'Solar Year') {
      drawMonthlyDividers(svg, timeframe);
    }

    // Draw main wave dividers
    if (displaySettings.mainWaveDividers) {
      drawWaveDividers(svg, timeframe);
    }

    // Calculate visible cycles
    const viewStartPixel = translateX;
    const cyclesToDraw = Math.ceil(CANVAS_WIDTH / CANVAS_PX) + 2;
    const startCycle = Math.floor(viewStartPixel / CANVAS_PX) - 1;
    
    // Draw main waves
    for (let cycleIndex = startCycle; cycleIndex < startCycle + cyclesToDraw; cycleIndex++) {
      const cycleOffsetX = cycleIndex * CANVAS_PX;
      drawMainWave(svg, timeframe, cycleOffsetX - translateX, true);
    }

    // Draw nested cycles
    drawNestedWaves(svg, timeframe);

    // Draw current time indicator
    if (displaySettings.todayLine) {
      drawCurrentTimeIndicator(svg, timeframe);
    }

    // Draw mouse hover line
    if (mousePosition && displaySettings.dashedDateTimeLine) {
      drawHoverLine(svg);
    }
  };

  // Draw monthly dividers
  const drawMonthlyDividers = (svg, timeframe) => {
    const monthPositions = [];
    for (let month = 0; month < 12; month++) {
      const monthProgress = month / 12;
      const monthPixel = monthProgress * CANVAS_PX;
      
      // Check if visible
      const adjustedPixel = monthPixel - (translateX % CANVAS_PX);
      if (adjustedPixel >= -50 && adjustedPixel <= CANVAS_WIDTH + 50) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', adjustedPixel);
        line.setAttribute('y1', 50);
        line.setAttribute('x2', adjustedPixel);
        line.setAttribute('y2', CANVAS_HEIGHT - 50);
        line.setAttribute('stroke', '#D0D0D0');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('opacity', '0.6');
        svg.appendChild(line);
      }
    }
  };

  // Draw wave dividers (quadrant separators)
  const drawWaveDividers = (svg, timeframe) => {
    const totalRatio = timeframe.quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    let currentX = -(translateX % CANVAS_PX);

    for (let quarter = 0; quarter < 4; quarter++) {
      const ratio = timeframe.quadrantRatios[quarter];
      const quarterWidth = (ratio / totalRatio) * CANVAS_PX;
      const dividerX = currentX + quarterWidth;

      if (dividerX >= -10 && dividerX <= CANVAS_WIDTH + 10) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', dividerX);
        line.setAttribute('y1', 70);
        line.setAttribute('x2', dividerX);
        line.setAttribute('y2', CANVAS_HEIGHT - 70);
        line.setAttribute('stroke', '#C0C0C0');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '2,4');
        line.setAttribute('opacity', '0.7');
        svg.appendChild(line);
      }

      currentX += quarterWidth;
    }
  };

  // Draw main wave with precise aspect positioning
  const drawMainWave = (svg, timeframe, offsetX, isMain = false) => {
    const totalRatio = timeframe.quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    let currentX = offsetX;
    const aspectPositions = [];

    for (let quarter = 0; quarter < 4; quarter++) {
      const ratio = timeframe.quadrantRatios[quarter];
      const quarterWidth = (ratio / totalRatio) * CANVAS_PX;
      const radius = quarterWidth / 2;
      const endX = currentX + quarterWidth;

      if (endX < -50 || currentX > CANVAS_WIDTH + 50) {
        currentX = endX;
        continue;
      }

      const centerX = currentX + radius;

      // Create quarter arc path
      let pathData;
      if (quarter === 0 || quarter === 2) {
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 1 ${endX} ${CENTER_Y}`;
      } else {
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 0 ${endX} ${CENTER_Y}`;
      }

      // Draw the wave segment
      if (displaySettings.lines) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#999999');
        path.setAttribute('stroke-width', isMain ? timeframe.strokeMain : timeframe.strokeMain * 0.6);
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }

      // Store CORRECT aspect positions
      if (quarter === 0) {
        // Magenta (0°) - START 
        aspectPositions.push({ x: currentX, y: CENTER_Y, color: ASPECT_COLORS[0] });
        // Red (90°) - PEAK 
        aspectPositions.push({ x: centerX, y: CENTER_Y - radius, color: ASPECT_COLORS[1] });
      } else if (quarter === 2) {
        // Green (180°) - CENTER crossing (where wave descends through center)
        aspectPositions.push({ x: currentX, y: CENTER_Y, color: ASPECT_COLORS[2] });
        // Blue (270°) - BOTTOM 
        aspectPositions.push({ x: centerX, y: CENTER_Y + radius, color: ASPECT_COLORS[3] });
      }

      currentX = endX;
    }

    // Final Magenta (360°)
    aspectPositions.push({ x: currentX, y: CENTER_Y, color: ASPECT_COLORS[0] });

    // Draw aspect points
    if (displaySettings.edges) {
      aspectPositions.forEach(aspect => {
        drawAspectPoint(svg, aspect.x, aspect.y, aspect.color, isMain);
      });
    }
  };

  // Draw professional aspect point
  const drawAspectPoint = (svg, x, y, color, isMain) => {
    if (x < -20 || x > CANVAS_WIDTH + 20) return;
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', isMain ? '6' : '4');
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#FFFFFF');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('filter', 'url(#professionalGlow)');
    svg.appendChild(circle);
  };

  // Draw nested waves
  const drawNestedWaves = (svg, mainTimeframe) => {
    const availableTimeframes = allTimeframes || TIMEFRAMES;
    const shorterTFs = availableTimeframes.filter(tf => 
      tf.periodDays < mainTimeframe.periodDays && 
      tf.name !== mainTimeframe.name &&
      selectedCycles.includes(tf.name)
    );

    shorterTFs.forEach((nestedTF, index) => {
      const cyclesPerMain = mainTimeframe.periodDays / nestedTF.periodDays;
      const nestedCyclePx = CANVAS_PX / cyclesPerMain;

      if (nestedCyclePx < 20) return;

      const strokeScale = Math.pow(nestedTF.periodDays / mainTimeframe.periodDays, 0.7);
      const scaledStroke = Math.max(0.5, nestedTF.strokeMain * strokeScale);

      const phase0Main = new Date(mainTimeframe.phase0);
      const phase0Nested = new Date(nestedTF.phase0);
      const phaseDelta = (phase0Nested.getTime() - phase0Main.getTime()) / (1000 * 60 * 60 * 24);
      const phaseOffsetPx = (phaseDelta / mainTimeframe.periodDays) * CANVAS_PX;

      const viewStartPixel = translateX;
      const nestedCyclesToDraw = Math.ceil(CANVAS_WIDTH / nestedCyclePx) + 2;
      const startNestedCycle = Math.floor((viewStartPixel - phaseOffsetPx) / nestedCyclePx) - 1;

      for (let cycleIndex = startNestedCycle; cycleIndex < startNestedCycle + nestedCyclesToDraw; cycleIndex++) {
        const cycleOffsetX = phaseOffsetPx + (cycleIndex * nestedCyclePx);
        drawScaledWave(svg, nestedTF, cycleOffsetX - translateX, nestedCyclePx, scaledStroke);
      }
    });
  };

  // Draw scaled nested wave
  const drawScaledWave = (svg, timeframe, offsetX, scalePx, strokeWidth) => {
    if (!displaySettings.lines) return;
    
    const totalRatio = timeframe.quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    let currentX = offsetX;
    const waveAmplitude = Math.max(15, 30);

    for (let quarter = 0; quarter < 4; quarter++) {
      const ratio = timeframe.quadrantRatios[quarter];
      const quarterWidth = (ratio / totalRatio) * scalePx;
      const radius = Math.min(quarterWidth / 2, waveAmplitude);
      const endX = currentX + quarterWidth;

      if (endX < -50 || currentX > CANVAS_WIDTH + 50) {
        currentX = endX;
        continue;
      }

      let pathData;
      if (quarter === 0 || quarter === 2) {
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 1 ${endX} ${CENTER_Y}`;
      } else {
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 0 ${endX} ${CENTER_Y}`;
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
    const visiblePositions = [];
    
    for (let cycle = -1; cycle <= 2; cycle++) {
      const pos = currentPixel + (cycle * CANVAS_PX);
      if (pos >= -10 && pos <= CANVAS_WIDTH + 10) {
        visiblePositions.push(pos);
      }
    }

    visiblePositions.forEach(indicatorX => {
      // Today line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', indicatorX);
      line.setAttribute('y1', 50);
      line.setAttribute('x2', indicatorX);
      line.setAttribute('y2', CANVAS_HEIGHT - 50);
      line.setAttribute('stroke', '#FF6B35');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('opacity', '0.8');
      svg.appendChild(line);
      
      // Today dot
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', indicatorX);
      dot.setAttribute('cy', CENTER_Y);
      dot.setAttribute('r', '6');
      dot.setAttribute('fill', '#FF6B35');
      dot.setAttribute('stroke', '#FFFFFF');
      dot.setAttribute('stroke-width', '2');
      svg.appendChild(dot);
    });
  };

  // Draw hover line with date
  const drawHoverLine = (svg) => {
    if (!mousePosition) return;

    // Vertical hover line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', mousePosition.x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', mousePosition.x);
    line.setAttribute('y2', CANVAS_HEIGHT);
    line.setAttribute('stroke', '#888888');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '4,4');
    line.setAttribute('opacity', '0.7');
    svg.appendChild(line);
  };

  // Mouse handlers
  const handleMouseMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
    
    // Calculate date at hover position
    const timeframe = getActiveTimeframe();
    const hoverPixel = translateX + x;
    const hoverDateCalc = pixelToDate(hoverPixel, timeframe);
    setHoverDate(hoverDateCalc);
    
    if (isDragging.current) {
      const deltaX = x - dragStart.current.x;
      onDrag && onDrag(deltaX);
      dragStart.current.x = x;
    }
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    const rect = svgRef.current.getBoundingClientRect();
    dragStart.current.x = e.clientX - rect.left;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
    setHoverDate(null);
    isDragging.current = false;
  };

  useEffect(() => {
    drawProfessionalWave();
  }, [activeTimeframe, currentDate, translateX, selectedCycles, displaySettings, mousePosition]);

  return (
    <div className="professional-wave-container">
      <svg
        ref={svgRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="professional-wave-svg"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Hover date display */}
      {hoverDate && mousePosition && displaySettings.dashedDateTimeLine && (
        <div 
          className="hover-date-display"
          style={{
            left: `${mousePosition.x}px`,
            top: `${CANVAS_HEIGHT + 10}px`
          }}
        >
          {hoverDate.toLocaleDateString('sk-SK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
        </div>
      )}
    </div>
  );
};

// Professional Timeline Component
const ProfessionalTimeline = ({ activeTimeframe, translateX, allTimeframes }) => {
  const getTimeframe = () => {
    return allTimeframes?.find(tf => tf.name === activeTimeframe) || 
           TIMEFRAMES.find(tf => tf.name === activeTimeframe) || 
           TIMEFRAMES[1];
  };

  const generateTimelineMarkers = () => {
    const timeframe = getTimeframe();
    const markers = [];
    const CANVAS_PX = 1460;
    
    const totalViewWidth = 3000;
    const cyclesToShow = Math.ceil(totalViewWidth / CANVAS_PX) + 2;
    const startCycle = Math.floor((translateX - totalViewWidth/2) / CANVAS_PX) - 1;

    if (activeTimeframe === 'Solar Year') {
      for (let cycleIndex = startCycle; cycleIndex < startCycle + cyclesToShow; cycleIndex++) {
        const cycleStartDate = new Date(timeframe.phase0);
        cycleStartDate.setFullYear(cycleStartDate.getFullYear() + cycleIndex);
        
        // Generate months
        for (let month = 0; month < 12; month++) {
          const monthDate = new Date(cycleStartDate);
          monthDate.setMonth(cycleStartDate.getMonth() + month);
          
          const deltaMs = monthDate.getTime() - cycleStartDate.getTime();
          const yearMs = timeframe.periodDays * 24 * 60 * 60 * 1000;
          const progress = deltaMs / yearMs;
          const pixelPos = (cycleIndex * CANVAS_PX) + (progress * CANVAS_PX);
          
          markers.push({
            type: 'month',
            date: monthDate,
            pixel: pixelPos,
            label: monthDate.toLocaleDateString('en', { month: 'short' }).toLowerCase(),
            year: monthDate.getFullYear()
          });
        }

        // Year transition markers
        const decemberDate = new Date(cycleStartDate.getFullYear(), 11, 31);
        const decPixel = (cycleIndex + 1) * CANVAS_PX - 50;
        markers.push({
          type: 'year-end',
          date: decemberDate,
          pixel: decPixel,
          label: `< ${decemberDate.getFullYear()}`,
          year: decemberDate.getFullYear()
        });

        const januaryDate = new Date(cycleStartDate.getFullYear() + 1, 0, 15);
        const janPixel = (cycleIndex + 1) * CANVAS_PX + 50;
        markers.push({
          type: 'year-start',
          date: januaryDate,
          pixel: janPixel,
          label: `${januaryDate.getFullYear()} >`,
          year: januaryDate.getFullYear()
        });
      }
    }
    
    return markers.filter(marker => 
      marker.pixel >= translateX - 200 && 
      marker.pixel <= translateX + 1400
    );
  };

  const markers = generateTimelineMarkers();

  return (
    <div className="professional-timeline">
      <div className="timeline-track">
        {markers.map((marker, index) => (
          <div
            key={`${marker.type}-${index}-${marker.pixel}`}
            className={`timeline-marker timeline-${marker.type}`}
            style={{ left: `${marker.pixel - translateX + 100}px` }}
          >
            <div className="marker-tick"></div>
            <div className="marker-label">{marker.label}</div>
          </div>
        ))}
        
        {/* Current date indicator on timeline */}
        <div className="current-date-indicator">
          4.6
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTimeframe, setActiveTimeframe] = useState('Solar Year');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentVisibleDate, setCurrentVisibleDate] = useState(new Date());
  const [translateX, setTranslateX] = useState(0);
  const [customTimeframes, setCustomTimeframes] = useState([]);
  const [selectedCycles, setSelectedCycles] = useState(['Lunar Month', 'Solar Day', 'Quarter']);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  
  // Display settings matching the screenshot
  const [displaySettings, setDisplaySettings] = useState({
    lines: true,
    dashedDateTimeLine: true,
    monthlyDividers: true,
    edges: true,
    todayLine: true,
    mainWaveDividers: true,
    xLine: true
  });

  const allTimeframes = [...TIMEFRAMES, ...customTimeframes];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleToggleDisplay = (setting) => {
    setDisplaySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleTimeFrameChange = (newTimeFrame) => {
    setActiveTimeframe(newTimeFrame);
    setTranslateX(0);
  };

  const handleDrag = (deltaX) => {
    setTranslateX(prev => prev - deltaX);
  };

  const handleArrowJump = (direction) => {
    const CYCLE_PX = 1460;
    setTranslateX(prev => prev + (direction * CYCLE_PX));
  };

  const handleDateChange = (newDate) => {
    setCurrentVisibleDate(newDate);
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

  return (
    <div className="App professional-app">
      {/* Left Controls Panel */}
      <LeftControlsPanel
        displaySettings={displaySettings}
        onToggleDisplay={handleToggleDisplay}
        isCollapsed={leftPanelCollapsed}
        onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
      />

      {/* Header */}
      <header className="professional-header">
        <div className="header-left">
          <span className="date-badge">{formatVisibleDate()}</span>
          <span className="time-badge">{formatVisibleTime()}</span>
        </div>
        
        <SiNoLogo />
        
        <div className="header-right">
          <div className="moon-phase">🌓</div>
          <span className="phase-text">1/4</span>
          <select 
            className="timeframe-select"
            value={activeTimeframe}
            onChange={(e) => handleTimeFrameChange(e.target.value)}
          >
            {allTimeframes.map(tf => (
              <option key={tf.name} value={tf.name}>
                {tf.name === 'Solar Year' ? '1 Sol. Year' : tf.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="professional-main">
        <div className="canvas-area">
          <button 
            className="nav-arrow nav-left"
            onClick={() => handleArrowJump(-1)}
          >
            ◁
          </button>
          
          <ProfessionalWaveCanvas
            activeTimeframe={activeTimeframe}
            currentDate={currentDate}
            translateX={translateX}
            selectedCycles={selectedCycles}
            allTimeframes={allTimeframes}
            displaySettings={displaySettings}
            onDrag={handleDrag}
            onDateChange={handleDateChange}
          />
          
          <button 
            className="nav-arrow nav-right"
            onClick={() => handleArrowJump(1)}
          >
            ▷
          </button>
        </div>
        
        <ProfessionalTimeline
          activeTimeframe={activeTimeframe}
          translateX={translateX}
          allTimeframes={allTimeframes}
        />
      </main>

      {/* Right Sidebar */}
      <div className="professional-right-sidebar">
        <button className="sidebar-btn">
          <div className="btn-icon">⚙</div>
        </button>
        
        <button className="sidebar-btn active">
          <div className="btn-icon wave-icon">
            <div className="wave-line"></div>
            <div className="wave-line"></div>
            <div className="wave-line"></div>
          </div>
        </button>
        
        <button className="sidebar-btn">
          <div className="btn-icon">👤</div>
        </button>
      </div>
    </div>
  );
}

export default App;