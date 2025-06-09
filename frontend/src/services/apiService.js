// API Service for SiNo Time Visualization
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

class ApiService {
  // Get all available cycles from backend
  static async getCycles() {
    try {
      const response = await fetch(`${API}/cycles`);
      if (!response.ok) {
        throw new Error('Failed to fetch cycles');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching cycles:', error);
      return [];
    }
  }

  // Get specific cycle by name
  static async getCycle(cycleName) {
    try {
      const response = await fetch(`${API}/cycles/${cycleName.toLowerCase().replace(' ', '_')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cycle');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching cycle:', error);
      return null;
    }
  }

  // Calculate position for given datetime and cycle
  static async calculatePosition(datetimeIso, cycleId) {
    try {
      const response = await fetch(`${API}/position`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datetime_iso: datetimeIso,
          cycle_id: cycleId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate position');
      }
      return await response.json();
    } catch (error) {
      console.error('Error calculating position:', error);
      return null;
    }
  }

  // Get current time positions for all cycles
  static async getCurrentTime() {
    try {
      const response = await fetch(`${API}/current_time`);
      if (!response.ok) {
        throw new Error('Failed to fetch current time');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching current time:', error);
      return {};
    }
  }

  // Get wave data for rendering
  static async getWaveData(cycleName, startDate = null, days = 30) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      params.append('days', days.toString());
      
      const response = await fetch(`${API}/wave_data/${cycleName.toLowerCase().replace(' ', '_')}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch wave data');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching wave data:', error);
      return null;
    }
  }

  // Create custom cycle
  static async createCustomCycle(cycleData) {
    try {
      const response = await fetch(`${API}/custom_cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cycleData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create custom cycle');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating custom cycle:', error);
      return null;
    }
  }
}

// Backend-compatible Cycle Calculator
class BackendCycleCalculator {
  // Convert datetime to pixel position using backend logic
  static datetimeToPixel(dtStr, cycle, cyclePx = 1460) {
    // Handle timezone information properly
    let dt;
    if (dtStr.endsWith('Z')) {
      dt = new Date(dtStr.replace('Z', '+00:00'));
    } else if (dtStr.includes('+') || dtStr.lastIndexOf('-') > 10) {
      dt = new Date(dtStr);
    } else {
      dt = new Date(dtStr + '+00:00');
    }
    
    const epoch = new Date(cycle.epoch.replace('Z', '+00:00'));
    
    // Calculate delta in smallest units
    const deltaSeconds = (dt.getTime() - epoch.getTime()) / 1000;
    const periodSeconds = cycle.period_days * 86400;
    const unitSeconds = cycle.unit_seconds;
    
    // Handle negative time (before epoch)
    let adjustedDelta = deltaSeconds;
    if (deltaSeconds < 0) {
      const periodsBefore = Math.floor(Math.abs(deltaSeconds) / periodSeconds);
      adjustedDelta = deltaSeconds + (periodsBefore + 1) * periodSeconds;
    }
    
    // Get position within current cycle
    const cycleProgress = (adjustedDelta % periodSeconds) / periodSeconds;
    
    // Calculate quadrant using backend quadrant_ratios
    const quadrantRatios = cycle.quadrant_ratios;
    const totalRatio = quadrantRatios.reduce((sum, ratio) => sum + ratio, 0);
    
    let cumulative = 0;
    let quadrant = 0;
    let quadrantProgress = 0;
    
    for (let i = 0; i < quadrantRatios.length; i++) {
      const ratio = quadrantRatios[i];
      const ratioPercent = ratio / totalRatio;
      if (cycleProgress <= cumulative + ratioPercent) {
        quadrant = i;
        quadrantProgress = (cycleProgress - cumulative) / ratioPercent;
        break;
      }
      cumulative += ratioPercent;
    }
    
    // Convert to pixel position
    const quadrantWidth = cyclePx / 4;
    const pixelX = quadrant * quadrantWidth + quadrantProgress * quadrantWidth;
    
    return {
      pixel_x: pixelX,
      phase_percent: cycleProgress * 100,
      quadrant: quadrant,
      quadrant_progress: quadrantProgress
    };
  }
  
  // Convert pixel position to datetime
  static pixelToDatetime(pixelX, cycle, cyclePx = 1460) {
    const epoch = new Date(cycle.epoch.replace('Z', '+00:00'));
    
    // Calculate cycle progress from pixel
    const cycleProgress = pixelX / cyclePx;
    
    // Convert to seconds
    const periodSeconds = cycle.period_days * 86400;
    const deltaSeconds = cycleProgress * periodSeconds;
    
    // Calculate target datetime
    const targetDt = new Date(epoch.getTime() + deltaSeconds * 1000);
    
    return targetDt.toISOString().replace('.000Z', 'Z');
  }
}

export { ApiService, BackendCycleCalculator };