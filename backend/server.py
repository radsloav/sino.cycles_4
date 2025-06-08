from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import uuid
from datetime import datetime, timedelta
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class CyclePreset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    epoch: str  # ISO datetime string
    period_days: float
    quadrant_ratios: List[int]  # 4 values
    unit_seconds: int
    base_stroke: float = 4.0
    color: str = "#FFC107"
    description: str = ""

class CycleCreate(BaseModel):
    name: str
    epoch: str
    period_days: float
    quadrant_ratios: List[int]
    unit_seconds: int
    base_stroke: float = 4.0
    color: str = "#FFC107"
    description: str = ""

class TimePosition(BaseModel):
    datetime_iso: str
    cycle_id: str

class PositionResponse(BaseModel):
    pixel_x: float
    phase_percent: float
    quadrant: int
    quadrant_progress: float

# Preset cycles data
PRESET_CYCLES = [
    {
        "name": "Great Year",
        "epoch": "2000-03-20T00:00:00Z",
        "period_days": 25920 * 365.2422,
        "quadrant_ratios": [6480, 6480, 6480, 6480],
        "unit_seconds": int(365.2422 * 86400),  # 1 tropical year
        "base_stroke": 8.0,
        "color": "#8B5CF6",
        "description": "25,920 year precession cycle"
    },
    {
        "name": "Zodiac Age",
        "epoch": "2000-03-20T00:00:00Z",
        "period_days": 2160 * 365.2422,
        "quadrant_ratios": [540, 540, 540, 540],
        "unit_seconds": int(365.2422 * 86400),  # 1 year
        "base_stroke": 6.0,
        "color": "#3B82F6",
        "description": "2,160 year astrological age"
    },
    {
        "name": "Solar Year",
        "epoch": "2025-03-20T00:00:00Z",
        "period_days": 365.2422,
        "quadrant_ratios": [92, 93, 88, 89],
        "unit_seconds": 86400,  # 1 day
        "base_stroke": 4.0,
        "color": "#FFC107",
        "description": "365.24 day tropical year"
    },
    {
        "name": "Lunar Month",
        "epoch": "2025-01-01T00:00:00Z",
        "period_days": 29.530589,
        "quadrant_ratios": [7, 8, 7, 7],
        "unit_seconds": 86400,  # 1 day
        "base_stroke": 3.0,
        "color": "#EC4899",
        "description": "29.53 day synodic month"
    },
    {
        "name": "Solar Day",
        "epoch": "2025-01-01T06:00:00Z",  # sunrise epoch
        "period_days": 1.0,
        "quadrant_ratios": [6, 6, 6, 6],  # dawn, noon, dusk, midnight
        "unit_seconds": 3600,  # 1 hour
        "base_stroke": 2.5,
        "color": "#10B981",
        "description": "24 hour solar day"
    },
    {
        "name": "Hour",
        "epoch": "2025-01-01T00:00:00Z",
        "period_days": 1/24,
        "quadrant_ratios": [15, 15, 15, 15],
        "unit_seconds": 60,  # 1 minute
        "base_stroke": 2.0,
        "color": "#06B6D4",
        "description": "60 minute hour"
    }
]

class CycleCalculator:
    @staticmethod
    def datetime_to_pixel(dt_str: str, cycle: Dict[str, Any], cycle_px: int = 1460) -> Dict[str, float]:
        """Convert datetime to pixel position within cycle"""
        # Handle timezone information properly
        if dt_str.endswith('Z'):
            dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        elif '+' in dt_str or '-' in dt_str[10:]:  # Check if timezone info is already present
            dt = datetime.fromisoformat(dt_str)
        else:
            dt = datetime.fromisoformat(dt_str + '+00:00')
        
        epoch = datetime.fromisoformat(cycle['epoch'].replace('Z', '+00:00'))
        
        # Calculate delta in smallest units
        delta_seconds = (dt - epoch).total_seconds()
        period_seconds = cycle['period_days'] * 86400
        unit_seconds = cycle['unit_seconds']
        
        # Handle negative time (before epoch)
        if delta_seconds < 0:
            # Find how many complete periods before epoch
            periods_before = abs(delta_seconds) // period_seconds
            delta_seconds = delta_seconds + (periods_before + 1) * period_seconds
        
        # Get position within current cycle
        cycle_progress = (delta_seconds % period_seconds) / period_seconds
        
        # Calculate quadrant
        quadrant_ratios = cycle['quadrant_ratios']
        total_ratio = sum(quadrant_ratios)
        
        cumulative = 0
        quadrant = 0
        quadrant_progress = 0
        
        for i, ratio in enumerate(quadrant_ratios):
            ratio_percent = ratio / total_ratio
            if cycle_progress <= cumulative + ratio_percent:
                quadrant = i
                quadrant_progress = (cycle_progress - cumulative) / ratio_percent
                break
            cumulative += ratio_percent
        
        # Convert to pixel position
        quadrant_width = cycle_px / 4
        pixel_x = quadrant * quadrant_width + quadrant_progress * quadrant_width
        
        return {
            "pixel_x": pixel_x,
            "phase_percent": cycle_progress * 100,
            "quadrant": quadrant,
            "quadrant_progress": quadrant_progress
        }
    
    @staticmethod
    def pixel_to_datetime(pixel_x: float, cycle: Dict[str, Any], cycle_px: int = 1460) -> str:
        """Convert pixel position to datetime"""
        epoch = datetime.fromisoformat(cycle['epoch'].replace('Z', '+00:00'))
        
        # Calculate cycle progress from pixel
        cycle_progress = pixel_x / cycle_px
        
        # Convert to seconds
        period_seconds = cycle['period_days'] * 86400
        delta_seconds = cycle_progress * period_seconds
        
        # Calculate target datetime
        target_dt = epoch + timedelta(seconds=delta_seconds)
        
        return target_dt.isoformat() + 'Z'

# API Routes
@api_router.get("/")
async def root():
    return {"message": "SiNo Time Visualization API"}

@api_router.get("/cycles", response_model=List[CyclePreset])
async def get_cycles():
    """Get all available cycle presets"""
    cycles = []
    for preset in PRESET_CYCLES:
        cycle = CyclePreset(**preset)
        cycles.append(cycle)
    return cycles

@api_router.get("/cycles/{cycle_name}")
async def get_cycle(cycle_name: str):
    """Get specific cycle by name"""
    for preset in PRESET_CYCLES:
        if preset['name'].lower().replace(' ', '_') == cycle_name.lower():
            return preset
    return {"error": "Cycle not found"}

@api_router.post("/position")
async def calculate_position(time_pos: TimePosition) -> PositionResponse:
    """Calculate pixel position for given datetime and cycle"""
    # Find cycle
    cycle = None
    for preset in PRESET_CYCLES:
        if preset['name'].lower().replace(' ', '_') == time_pos.cycle_id.lower():
            cycle = preset
            break
    
    if not cycle:
        return {"error": "Cycle not found"}
    
    result = CycleCalculator.datetime_to_pixel(time_pos.datetime_iso, cycle)
    return PositionResponse(**result)

@api_router.get("/current_time")
async def get_current_time():
    """Get current time in all cycles"""
    current_time = datetime.utcnow().isoformat() + 'Z'
    results = {}
    
    for preset in PRESET_CYCLES:
        position = CycleCalculator.datetime_to_pixel(current_time, preset)
        results[preset['name']] = {
            **position,
            "datetime": current_time,
            "cycle": preset
        }
    
    return results

@api_router.post("/custom_cycle", response_model=CyclePreset)
async def create_custom_cycle(cycle: CycleCreate):
    """Create a custom cycle preset"""
    cycle_dict = cycle.dict()
    cycle_obj = CyclePreset(**cycle_dict)
    # In a real app, you'd save to database
    return cycle_obj

@api_router.get("/wave_data/{cycle_name}")
async def get_wave_data(cycle_name: str, start_date: str = None, days: int = 30):
    """Get wave rendering data for specified period"""
    if start_date is None:
        start_date = datetime.utcnow().isoformat() + 'Z'
    
    # Find cycle
    cycle = None
    for preset in PRESET_CYCLES:
        if preset['name'].lower().replace(' ', '_') == cycle_name.lower():
            cycle = preset
            break
    
    if not cycle:
        return {"error": "Cycle not found"}
    
    # Generate wave points
    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    points = []
    
    for day in range(days):
        dt = start_dt + timedelta(days=day)
        dt_str = dt.isoformat() + 'Z'
        position = CycleCalculator.datetime_to_pixel(dt_str, cycle)
        points.append({
            "date": dt_str,
            "x": position['pixel_x'],
            "phase": position['phase_percent'],
            "quadrant": position['quadrant']
        })
    
    return {
        "cycle": cycle,
        "points": points,
        "cycle_px": 1460
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
