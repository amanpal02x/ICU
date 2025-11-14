from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from datetime import datetime
from pydantic import BaseModel
import json

from monitor_processor import UniversalMonitorProcessor

router = APIRouter(prefix="/monitor-data", tags=["monitor-data"])

class DeviceDataMapping(BaseModel):
    name: str
    device_type: str
    field_mappings: Dict[str, str]  # Maps incoming fields to model features
    connection_type: str
    connection_config: Dict[str, Any] = {}
    is_active: bool = True

class RawVitalData(BaseModel):
    device_id: str
    timestamp: datetime = None
    data: Dict[str, Any]  # Raw vital data in any format
    device_type: str = "unknown"

# Universal data ingestion endpoint
@router.post("/ingest")
async def ingest_monitor_data(raw_data: RawVitalData):
    """Universal endpoint that accepts vital data from ANY ICU monitor"""

    if raw_data.timestamp is None:
        raw_data.timestamp = datetime.utcnow()

    # Process through universal pipeline
    processor = UniversalMonitorProcessor()
    result = await processor.process_monitor_data(raw_data)

    return result

# Test endpoint that accepts any JSON
@router.post("/test-ingest")
async def test_ingest_monitor_data(data: Dict[str, Any]):
    """Test endpoint for trying different monitor data formats"""

    # Create RawVitalData from free-form JSON
    raw_data = RawVitalData(
        device_id=data.get("device_id", "test_device"),
        timestamp=data.get("timestamp", datetime.utcnow()),
        data=data.get("data", data),  # Allow data at root level too
        device_type=data.get("device_type", "unknown")
    )

    processor = UniversalMonitorProcessor()
    result = await processor.process_monitor_data(raw_data)

    return {
        "status": "success",
        "processed_data": result,
        "original_data": data
    }

@router.get("/supported-devices")
async def get_supported_devices():
    """Get list of configured device types and their mappings"""
    processor = UniversalMonitorProcessor()
    mappings = await processor.get_all_mappings()
    return mappings

@router.post("/device-mappings")
async def create_device_mapping(mapping: DeviceDataMapping):
    """Create a new device field mapping"""
    processor = UniversalMonitorProcessor()
    result = await processor.create_device_mapping(mapping.dict())
    return result

@router.post("/device-assignments")
async def create_device_assignment(assignment: Dict[str, Any]):
    """Assign a device to a patient"""
    processor = UniversalMonitorProcessor()
    result = await processor.create_device_assignment(assignment)
    return result

@router.get("/unassigned-devices")
async def get_unassigned_devices():
    """Get list of devices that sent data but aren't assigned to patients"""
    processor = UniversalMonitorProcessor()
    devices = await processor.get_unassigned_devices()
    return devices
