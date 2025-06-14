import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { ApiService, BackendCycleCalculator } from './services/apiService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Convert backend cycle format to frontend format
const convertBackendCycle = (backendCycle) => {
  return {
    name: backendCycle.name,
    periodDays: backendCycle.period_days,
    phase0: backendCycle.epoch,
    strokeMain: backendCycle.base_stroke,
    quadrantRatios: backendCycle.quadrant_ratios,
    editable: true,
    colors: ['#FF0080', '#FF4444', '#00FF44', '#0080FF'], // M-R-G-B standard
    // Keep backend data for calculations
    backendData: backendCycle
  };
};

// SiNo Logo Component
const SiNoLogo = () => (
  <div className="sino-logo">
    <span className="logo-s">S</span>
    <div className="logo-wave">~</div>
    <span className="logo-no">iNo</span>
  </div>
);

// Custom Cycle Creator with Colors
const CustomCycleCreator = ({ isOpen, onClose, onCreateCycle }) => {
  const [formData, setFormData] = useState({
    name: '',
    periodDays: '',
    phase0: '2025-03-21T00:00:00',
    strokeMain: 3,
    quadrantRatios: [25, 25, 25, 25],
    colors: ['#FF0080', '#FF4444', '#00FF44', '#0080FF'] // M-R-G-B default
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newCycle = {
      ...formData,
      periodDays: parseFloat(formData.periodDays),
      quadrantRatios: formData.quadrantRatios.map(r => parseInt(r)),
      phase0: formData.phase0 + 'Z',
      editable: true
    };
    onCreateCycle(newCycle);
    onClose();
    setFormData({
      name: '',
      periodDays: '',
      phase0: '2025-03-21T00:00:00',
      strokeMain: 3,
      quadrantRatios: [25, 25, 25, 25],
      colors: ['#FF0080', '#FF4444', '#00FF44', '#0080FF']
    });
  };

  const handleColorChange = (index, color) => {
    const newColors = [...formData.colors];
    newColors[index] = color;
    setFormData({...formData, colors: newColors});
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="custom-cycle-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Custom Cycle</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="cycle-form">
          <div className="form-group">
            <label>Cycle Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g., Mars Synodic"
            />
          </div>

          <div className="form-group">
            <label>Period (days):</label>
            <input
              type="number"
              step="0.001"
              value={formData.periodDays}
              onChange={(e) => setFormData({...formData, periodDays: e.target.value})}
              required
              placeholder="e.g., 779.94"
            />
          </div>

          <div className="form-group">
            <label>Start Date (Phase 0°):</label>
            <input
              type="datetime-local"
              value={formData.phase0}
              onChange={(e) => setFormData({...formData, phase0: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Stroke Width:</label>
            <input
              type="range"
              min="1"
              max="8"
              step="0.1"
              value={formData.strokeMain}
              onChange={(e) => setFormData({...formData, strokeMain: parseFloat(e.target.value)})}
            />
            <span>{formData.strokeMain}px</span>
          </div>

          <div className="form-group">
            <label>Phase Colors (M-R-G-B):</label>
            <div className="color-inputs">
              {['Magenta (0°)', 'Red (90°)', 'Green (180°)', 'Blue (270°)'].map((phase, index) => (
                <div key={index} className="color-input-group">
                  <span className="color-label">{phase}</span>
                  <input
                    type="color"
                    value={formData.colors[index]}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Quadrant Ratios:</label>
            <div className="quadrant-inputs">
              {formData.quadrantRatios.map((ratio, index) => (
                <input
                  key={index}
                  type="number"
                  value={ratio}
                  onChange={(e) => {
                    const newRatios = [...formData.quadrantRatios];
                    newRatios[index] = parseInt(e.target.value) || 0;
                    setFormData({...formData, quadrantRatios: newRatios});
                  }}
                  placeholder={`Q${index + 1}`}
                  min="1"
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Create Cycle</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Curve Settings Modal
const CurveSettingsModal = ({ isOpen, onClose, availableCycles, selectedCycles, onCycleToggle, onEditCycle, onCreateCustom }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Curve Settings</h2>
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
                  <div className="cycle-info">
                    <span className="cycle-name">{cycle.name}</span>
                    <span className="cycle-period">({cycle.periodDays.toFixed(1)} days)</span>
                  </div>
                  <div className="cycle-colors">
                    {cycle.colors.map((color, index) => (
                      <div key={index} className="color-dot" style={{backgroundColor: color}}></div>
                    ))}
                  </div>
                </label>
                {cycle.editable && (
                  <button 
                    className="edit-cycle-btn"
                    onClick={() => onEditCycle(cycle)}
                    title="Edit cycle"
                  >
                    ✏️
                  </button>
                )}
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

// Right Settings Panel
const RightSettingsPanel = ({ 
  isOpen,
  onClose,
  lineSettings, 
  onToggleLineSettings,
  curveSettings,
  onToggleCurveSettings,
  onOpenCurveSettings
}) => {
  const [activeSection, setActiveSection] = useState('lines');

  if (!isOpen) return null;

  return (
    <div className="right-settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="close-settings-btn" onClick={onClose}>×</button>
      </div>

      {/* Section Tabs */}
      <div className="settings-tabs">
        <button 
          className={`settings-tab ${activeSection === 'lines' ? 'active' : ''}`}
          onClick={() => setActiveSection('lines')}
        >
          Lines
        </button>
        <button 
          className={`settings-tab ${activeSection === 'curves' ? 'active' : ''}`}
          onClick={() => setActiveSection('curves')}
        >
          Curves
        </button>
      </div>

      <div className="settings-content">
        {/* Lines Section */}
        {activeSection === 'lines' && (
          <div className="settings-group">
            <div className="settings-section-title">Line Settings</div>
            
            {[
              { key: 'mainWaveLines', label: 'main wave lines' },
              { key: 'nestedWaveLines', label: 'nested wave lines' },
              { key: 'dashedDateTimeLine', label: 'dashed date-time line' },
              { key: 'monthlyDividers', label: 'monthly dividers' },
              { key: 'waveDividers', label: 'wave dividers' },
              { key: 'centerAxisLine', label: 'center axis line' },
              { key: 'todayLine', label: 'today line' },
              { key: 'aspectPoints', label: 'aspect points' }
            ].map(({ key, label }) => (
              <div key={key} className="settings-item">
                <span className="settings-label">{label}</span>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={lineSettings[key]}
                    onChange={() => onToggleLineSettings(key)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Curves Section */}
        {activeSection === 'curves' && (
          <div className="settings-group">
            <div className="settings-section-title">Curve Settings</div>
            
            <div className="curves-summary">
              <p>{Object.values(curveSettings).filter(v => v).length} cycles visible</p>
            </div>

            <button 
              className="manage-cycles-btn"
              onClick={onOpenCurveSettings}
            >
              Manage Cycles & Visibility
            </button>

            <div className="quick-curve-toggles">
              <h4>Quick Toggles:</h4>
              {Object.entries(curveSettings).slice(0, 5).map(([cycleName, isVisible]) => (
                <div key={cycleName} className="settings-item">
                  <span className="settings-label">{cycleName}</span>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => onToggleCurveSettings(cycleName)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Professional Wave Canvas with Correct Dating
const ProfessionalWaveCanvas = ({ 
  activeTimeframe, 
  currentDate, 
  translateX, 
  selectedCycles,
  allTimeframes,
  lineSettings,
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

  const getActiveTimeframe = () => {
    return allTimeframes?.find(tf => tf.name === activeTimeframe) || 
           allTimeframes?.[0];
  };

  // Use backend CycleCalculator for precise positioning
  const dateToPixel = (date, timeframe) => {
    if (!timeframe?.backendData) return 0;
    
    const dtStr = date.toISOString();
    const result = BackendCycleCalculator.datetimeToPixel(dtStr, timeframe.backendData);
    return result.pixel_x;
  };

  const pixelToDate = (pixel, timeframe) => {
    if (!timeframe?.backendData) return new Date();
    
    const dtStr = BackendCycleCalculator.pixelToDatetime(pixel, timeframe.backendData);
    return new Date(dtStr);
  };

  // Draw professional wave with CORRECT aspect positioning
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

    // Draw center axis line
    if (lineSettings.centerAxisLine) {
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

    // Draw calendar monthly dividers
    if (lineSettings.monthlyDividers && activeTimeframe === 'Solar Year') {
      drawCalendarMonthlyDividers(svg, timeframe);
    }

    // Draw wave dividers
    if (lineSettings.waveDividers) {
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
    if (lineSettings.nestedWaveLines) {
      drawNestedWaves(svg, timeframe);
    }

    // Draw current time indicator
    if (lineSettings.todayLine) {
      drawCurrentTimeIndicator(svg, timeframe);
    }

    // Draw mouse hover line
    if (mousePosition && lineSettings.dashedDateTimeLine) {
      drawHoverLine(svg);
    }
  };

  // Draw calendar monthly dividers (1st of each month) - ONLY ONCE
  const drawCalendarMonthlyDividers = (svg, timeframe) => {
    if (activeTimeframe !== 'Solar Year') return; // Only for Solar Year
    
    const baseYear = 2025;
    const drawnPositions = new Set(); // Prevent duplicates
    
    for (let year = baseYear - 2; year <= baseYear + 5; year++) {
      for (let month = 0; month < 12; month++) {
        // First day of each calendar month
        const monthStart = new Date(year, month, 1);
        const monthPixel = dateToPixel(monthStart, timeframe);
        
        // Calculate position relative to current view
        const adjustedPixel = monthPixel - translateX;
        const pixelKey = Math.round(adjustedPixel); // Round to prevent tiny differences
        
        if (adjustedPixel >= -50 && adjustedPixel <= CANVAS_WIDTH + 50 && !drawnPositions.has(pixelKey)) {
          drawnPositions.add(pixelKey);
          
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

  // Draw main wave with PRECISE aspect positioning using backend quadrant ratios
  const drawMainWave = (svg, timeframe, offsetX, isMain = false) => {
    if (!lineSettings.mainWaveLines || !timeframe?.backendData) return;
    
    const backendCycle = timeframe.backendData;
    const quadrantRatios = backendCycle.quadrant_ratios;
    const totalRatio = quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    let currentX = offsetX;
    const aspectPositions = [];
    const colors = timeframe.colors || ['#FF0080', '#FF4444', '#00FF44', '#0080FF'];

    for (let quarter = 0; quarter < 4; quarter++) {
      const ratio = quadrantRatios[quarter];
      const quarterWidth = (ratio / totalRatio) * CANVAS_PX;
      const radius = quarterWidth / 2;
      const endX = currentX + quarterWidth;

      if (endX < -50 || currentX > CANVAS_WIDTH + 50) {
        currentX = endX;
        continue;
      }

      const centerX = currentX + radius;

      // Create quarter arc path - proper wave form
      let pathData;
      if (quarter === 0 || quarter === 2) {
        // Quadrants 0 and 2: ascending arc
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 1 ${endX} ${CENTER_Y}`;
      } else {
        // Quadrants 1 and 3: descending arc
        pathData = `M ${currentX} ${CENTER_Y} A ${radius} ${radius} 0 0 0 ${endX} ${CENTER_Y}`;
      }

      // Draw the wave segment
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', isMain ? backendCycle.color : '#999999');
      path.setAttribute('stroke-width', isMain ? backendCycle.base_stroke : backendCycle.base_stroke * 0.6);
      path.setAttribute('fill', 'none');
      svg.appendChild(path);

      // Store PRECISE aspect positions using backend quadrant ratios:
      if (quarter === 0) {
        // Magenta (0°) - START of cycle (e.g., 21. March for Solar Year)
        aspectPositions.push({ x: currentX, y: CENTER_Y, color: colors[0] });
      } else if (quarter === 1) {
        // Red (90°) - PEAK of first half (e.g., June solstice)
        aspectPositions.push({ x: centerX, y: CENTER_Y - radius, color: colors[1] });
      } else if (quarter === 2) {
        // Green (180°) - CENTER crossing (e.g., September equinox)
        aspectPositions.push({ x: currentX, y: CENTER_Y, color: colors[2] });
      } else if (quarter === 3) {
        // Blue (270°) - BOTTOM of second half (e.g., December solstice)
        aspectPositions.push({ x: centerX, y: CENTER_Y + radius, color: colors[3] });
      }

      currentX = endX;
    }

    // Final Magenta (360°/0°) - END/START of next cycle
    aspectPositions.push({ x: currentX, y: CENTER_Y, color: colors[0] });

    // Draw aspect points with precise positioning
    if (lineSettings.aspectPoints) {
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

  // Draw nested waves using backend data
  const drawNestedWaves = (svg, mainTimeframe) => {
    if (!mainTimeframe?.backendData) return;
    
    const availableTimeframes = allTimeframes || [];
    const shorterTFs = availableTimeframes.filter(tf => 
      tf.backendData && 
      tf.backendData.period_days < mainTimeframe.backendData.period_days && 
      tf.name !== mainTimeframe.name &&
      selectedCycles.includes(tf.name)
    );

    shorterTFs.forEach((nestedTF, index) => {
      const cyclesPerMain = mainTimeframe.backendData.period_days / nestedTF.backendData.period_days;
      const nestedCyclePx = CANVAS_PX / cyclesPerMain;

      if (nestedCyclePx < 20) return;

      const strokeScale = Math.pow(nestedTF.backendData.period_days / mainTimeframe.backendData.period_days, 0.7);
      const scaledStroke = Math.max(0.5, nestedTF.backendData.base_stroke * strokeScale);

      const phase0Main = new Date(mainTimeframe.backendData.epoch.replace('Z', '+00:00'));
      const phase0Nested = new Date(nestedTF.backendData.epoch.replace('Z', '+00:00'));
      const phaseDelta = (phase0Nested.getTime() - phase0Main.getTime()) / (1000 * 60 * 60 * 24);
      const phaseOffsetPx = (phaseDelta / mainTimeframe.backendData.period_days) * CANVAS_PX;

      const viewStartPixel = translateX;
      const nestedCyclesToDraw = Math.ceil(CANVAS_WIDTH / nestedCyclePx) + 2;
      const startNestedCycle = Math.floor((viewStartPixel - phaseOffsetPx) / nestedCyclePx) - 1;

      for (let cycleIndex = startNestedCycle; cycleIndex < startNestedCycle + nestedCyclesToDraw; cycleIndex++) {
        const cycleOffsetX = phaseOffsetPx + (cycleIndex * nestedCyclePx);
        drawScaledWave(svg, nestedTF, cycleOffsetX - translateX, nestedCyclePx, scaledStroke);
      }
    });
  };

  // Draw scaled nested wave using backend quadrant ratios
  const drawScaledWave = (svg, timeframe, offsetX, scalePx, strokeWidth) => {
    if (!timeframe?.backendData) return;
    
    const quadrantRatios = timeframe.backendData.quadrant_ratios;
    const totalRatio = quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    let currentX = offsetX;
    const waveAmplitude = Math.max(15, 30);

    for (let quarter = 0; quarter < 4; quarter++) {
      const ratio = quadrantRatios[quarter];
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
      path.setAttribute('stroke', timeframe.backendData.color || '#BBBBBB');
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
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', indicatorX);
      line.setAttribute('y1', 50);
      line.setAttribute('x2', indicatorX);
      line.setAttribute('y2', CANVAS_HEIGHT - 50);
      line.setAttribute('stroke', '#FF6B35');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('opacity', '0.8');
      svg.appendChild(line);
      
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
  }, [activeTimeframe, currentDate, translateX, selectedCycles, lineSettings, mousePosition]);

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
      {hoverDate && mousePosition && lineSettings.dashedDateTimeLine && (
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

// Professional Timeline with EXACT Calendar Synchronization
// Professional Timeline with Backend Integration
const ProfessionalTimeline = ({ activeTimeframe, translateX, allTimeframes }) => {
  const getTimeframe = () => {
    return allTimeframes?.find(tf => tf.name === activeTimeframe) || 
           allTimeframes?.[0];
  };

  // Calculate exact pixel position using backend data
  const dateToTimelinePixel = (date, timeframe) => {
    if (!timeframe?.backendData) return 0;
    
    const dtStr = date.toISOString();
    const result = BackendCycleCalculator.datetimeToPixel(dtStr, timeframe.backendData);
    return result.pixel_x;
  };

  // Generate timeline markers using backend precision
  const generateSynchronizedTimelineMarkers = () => {
    const timeframe = getTimeframe();
    if (!timeframe?.backendData) return [];
    
    const markers = [];
    
    if (activeTimeframe === 'Solar Year') {
      const viewStart = translateX - 400;
      const viewEnd = translateX + 1800;
      
      // Generate markers for years around current view
      for (let year = 2023; year <= 2030; year++) {
        // Calendar months - exact 1st of month
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                           'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        
        monthNames.forEach((monthName, monthIndex) => {
          const monthDate = new Date(year, monthIndex, 1);
          const monthPixel = dateToTimelinePixel(monthDate, timeframe);
          
          if (monthPixel >= viewStart && monthPixel <= viewEnd) {
            markers.push({
              type: 'month',
              date: monthDate,
              pixel: monthPixel,
              label: monthName,
              year: year
            });
          }
        });

        // Year boundaries - exactly at year transitions
        const yearEndDate = new Date(year, 11, 31); // December 31
        const yearStartDate = new Date(year + 1, 0, 1); // January 1
        
        const yearEndPixel = dateToTimelinePixel(yearEndDate, timeframe);
        const yearStartPixel = dateToTimelinePixel(yearStartDate, timeframe);
        
        if (yearEndPixel >= viewStart && yearEndPixel <= viewEnd) {
          markers.push({
            type: 'year-end',
            date: yearEndDate,
            pixel: yearEndPixel,
            label: `< ${year}`,
            year: year
          });
        }
        
        if (yearStartPixel >= viewStart && yearStartPixel <= viewEnd) {
          markers.push({
            type: 'year-start',
            date: yearStartDate,
            pixel: yearStartPixel,
            label: `${year + 1} >`,
            year: year + 1
          });
        }
      }
    }
    
    return markers;
  };

  const markers = generateSynchronizedTimelineMarkers();
  const timeframe = getTimeframe();

  return (
    <div className="professional-timeline">
      <div className="timeline-track">
        {markers.map((marker, index) => (
          <div
            key={`${marker.type}-${marker.year}-${marker.pixel}`}
            className={`timeline-marker timeline-${marker.type}`}
            style={{ left: `${marker.pixel - translateX + 100}px` }}
          >
            <div className="marker-tick"></div>
            <div className="marker-label">{marker.label}</div>
          </div>
        ))}
        
        {/* Current date indicator - using backend precision */}
        {timeframe && (
          <div 
            className="current-date-indicator"
            style={{
              left: `${dateToTimelinePixel(new Date(), timeframe) - translateX + 100}px`
            }}
          >
            {new Date().getDate()}.{new Date().getMonth() + 1}
          </div>
        )}
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
  const [backendCycles, setBackendCycles] = useState([]);
  const [customTimeframes, setCustomTimeframes] = useState([]);
  const [selectedCycles, setSelectedCycles] = useState(['Lunar Month', 'Solar Day']);
  const [showRightSettings, setShowRightSettings] = useState(false);
  const [showCurveSettings, setShowCurveSettings] = useState(false);
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTimeData, setCurrentTimeData] = useState({});
  
  // Enhanced line settings
  const [lineSettings, setLineSettings] = useState({
    mainWaveLines: true,
    nestedWaveLines: true,
    dashedDateTimeLine: true,
    monthlyDividers: true,
    waveDividers: true,
    centerAxisLine: true,
    todayLine: true,
    aspectPoints: true
  });

  // Curve visibility settings
  const [curveSettings, setCurveSettings] = useState({
    'Lunar Month': true,
    'Solar Day': true,
    'Quarter': true,
    'Mercury Synodic': false,
    'Venus Synodic': false
  });

  // Load backend cycles and current time data
  useEffect(() => {
    const loadBackendData = async () => {
      setLoading(true);
      try {
        // Load cycles from backend
        const cycles = await ApiService.getCycles();
        const convertedCycles = cycles.map(convertBackendCycle);
        setBackendCycles(convertedCycles);
        
        // Load current time data
        const currentTime = await ApiService.getCurrentTime();
        setCurrentTimeData(currentTime);
        
        // Update selected cycles to available backend cycles
        const availableCycles = convertedCycles.map(c => c.name);
        setSelectedCycles(prev => prev.filter(name => availableCycles.includes(name)));
        
      } catch (error) {
        console.error('Error loading backend data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBackendData();
  }, []);

  // Update current time and positions every minute
  useEffect(() => {
    const updateCurrentTime = async () => {
      try {
        const currentTime = await ApiService.getCurrentTime();
        setCurrentTimeData(currentTime);
        setCurrentDate(new Date());
      } catch (error) {
        console.error('Error updating current time:', error);
      }
    };

    const interval = setInterval(updateCurrentTime, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const allTimeframes = [...backendCycles, ...customTimeframes];

  const handleToggleLineSettings = (setting) => {
    setLineSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleToggleCurveSettings = (cycleName) => {
    setCurveSettings(prev => ({
      ...prev,
      [cycleName]: !prev[cycleName]
    }));
    
    setSelectedCycles(prev => 
      prev.includes(cycleName) 
        ? prev.filter(name => name !== cycleName)
        : [...prev, cycleName]
    );
  };

  const handleCycleToggle = (cycleName) => {
    setSelectedCycles(prev => 
      prev.includes(cycleName) 
        ? prev.filter(name => name !== cycleName)
        : [...prev, cycleName]
    );
    
    setCurveSettings(prev => ({
      ...prev,
      [cycleName]: !prev[cycleName]
    }));
  };

  const handleCreateCustomCycle = (newCycle) => {
    setCustomTimeframes(prev => [...prev, newCycle]);
    setSelectedCycles(prev => [...prev, newCycle.name]);
    setCurveSettings(prev => ({
      ...prev,
      [newCycle.name]: true
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

  const getAvailableCycles = () => {
    const activeTimeframePeriod = allTimeframes.find(tf => tf.name === activeTimeframe)?.periodDays || 365;
    return allTimeframes.filter(tf => tf.periodDays < activeTimeframePeriod && tf.name !== activeTimeframe);
  };

  return (
    <div className="App professional-app">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="sino-logo">
              <span className="logo-s">S</span>
              <div className="logo-wave">~</div>
              <span className="logo-no">iNo</span>
            </div>
            <p>Načítavam presné cykly...</p>
          </div>
        </div>
      )}

      {/* Right Settings Panel */}
      <RightSettingsPanel
        isOpen={showRightSettings}
        onClose={() => setShowRightSettings(false)}
        lineSettings={lineSettings}
        onToggleLineSettings={handleToggleLineSettings}
        curveSettings={curveSettings}
        onToggleCurveSettings={handleToggleCurveSettings}
        onOpenCurveSettings={() => setShowCurveSettings(true)}
      />

      {/* Curve Settings Modal */}
      <CurveSettingsModal
        isOpen={showCurveSettings}
        onClose={() => setShowCurveSettings(false)}
        availableCycles={getAvailableCycles()}
        selectedCycles={selectedCycles}
        onCycleToggle={handleCycleToggle}
        onEditCycle={() => {}}
        onCreateCustom={() => setShowCustomCreator(true)}
      />

      {/* Custom Cycle Creator */}
      <CustomCycleCreator
        isOpen={showCustomCreator}
        onClose={() => setShowCustomCreator(false)}
        onCreateCycle={handleCreateCustomCycle}
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
          
          {!loading && allTimeframes.length > 0 && (
            <ProfessionalWaveCanvas
              activeTimeframe={activeTimeframe}
              currentDate={currentDate}
              translateX={translateX}
              selectedCycles={selectedCycles}
              allTimeframes={allTimeframes}
              lineSettings={lineSettings}
              onDrag={handleDrag}
              onDateChange={handleDateChange}
            />
          )}
          
          <button 
            className="nav-arrow nav-right"
            onClick={() => handleArrowJump(1)}
          >
            ▷
          </button>
        </div>
        
        {!loading && allTimeframes.length > 0 && (
          <ProfessionalTimeline
            activeTimeframe={activeTimeframe}
            translateX={translateX}
            allTimeframes={allTimeframes}
          />
        )}
      </main>

      {/* Right Sidebar */}
      <div className="professional-right-sidebar">
        <button 
          className="sidebar-btn"
          onClick={() => setShowRightSettings(true)}
        >
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