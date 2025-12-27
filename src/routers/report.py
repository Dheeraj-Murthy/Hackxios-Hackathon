from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import json
from bson import ObjectId
from bson.json_util import dumps

from src.db.mongoWrapper import getMongo
from src.schemas import ReportModel
from src.utils.file_handler import FileHandler

router = APIRouter(prefix="/api")

# Initialize services
file_handler = FileHandler()


@router.get("/ping")
def ping():
    return {"message": "pong"}


@router.get("/db-test")
async def test_db():
    try:
        mongo = await getMongo()
        if mongo is None:
            return {"status": "error", "message": "Database not connected"}
        
        # Test basic operation
        count = await mongo.count("Reports", {})
        return {"status": "ok", "report_count": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/reports/upload")
async def upload_report(file: UploadFile = File(...), patient_id: Optional[str] = None):
    """
    Upload and process a medical report PDF
    """
    file_path = None
    csv_file_path = None
    
    try:
        # Save uploaded file
        file_id, file_path = await file_handler.save_upload_file(file)
        
        # Extract CSV from PDF
        csv_file_path = os.path.join(file_handler.upload_dir, f"{file_id}_extracted.csv")
        csv_extraction_result = file_handler.extract_csv(file_path, csv_file_path)
        
        # Parse extracted CSV data
        if not csv_extraction_result or not csv_extraction_result.get("success"):
            raise HTTPException(status_code=400, detail="CSV extraction failed")
            
        csv_parsing_result = file_handler.parse_csv(csv_file_path)
        if not csv_parsing_result or not csv_parsing_result.get("success"):
            raise HTTPException(status_code=400, detail="CSV parsing failed")
        
        # Get CSV structured data
        csv_data = csv_parsing_result.get("data", [])
        
        # Create attributes dictionary with CSV data (all 4 columns)
        parsed_attributes = {}
        for i, test in enumerate(csv_data, 1):
            key = f"test_{i}"
            parsed_attributes[key] = test
        
        # Generate patient ID if not provided
        if not patient_id:
            patient_id = f"patient_{file_id[:8]}"
        
        # Create report
        report_id = f"report_{file_id[:8]}"
        
        report_data = {
            "Report_id": report_id,
            "Patient_id": patient_id,
            "Attributes": parsed_attributes,
            "Processed_at": None  # Will be set by MongoDB
        }
        
        # Save to database
        mongo = await getMongo()
        if mongo is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        result_id = await mongo.insert_one("Reports", report_data)
        
        # Clean up temporary files
        file_handler.delete_file(file_path)
        if csv_file_path and os.path.exists(csv_file_path):
            os.remove(csv_file_path)
        
        return {
            "message": "Report uploaded and processed successfully",
            "report_id": report_id,
            "patient_id": patient_id,
            "tests_stored": len(parsed_attributes),
            "id": result_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file on error
        if file_path is not None:
            file_handler.delete_file(file_path)
        if csv_file_path and os.path.exists(csv_file_path):
            os.remove(csv_file_path)
        raise HTTPException(status_code=500, detail=f"Error processing report: {str(e)}")


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    """
    Retrieve a specific report by ID
    """
    try:
        mongo = await getMongo()
        if mongo is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        report = await mongo.find_one("Reports", {"Report_id": report_id})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in report:
            report["_id"] = str(report["_id"])
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving report: {str(e)}")


@router.get("/reports/patient/{patient_id}")
async def get_patient_reports(patient_id: str):
    """
    Retrieve all reports for a specific patient
    """
    try:
        mongo = await getMongo()
        if mongo is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        reports = await mongo.find_many("Reports", {"Patient_id": patient_id}, limit=50)
        
        # Convert ObjectIds to strings for JSON serialization
        for report in reports:
            if "_id" in report:
                report["_id"] = str(report["_id"])
        
        return {
            "patient_id": patient_id,
            "report_count": len(reports),
            "reports": reports
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving patient reports: {str(e)}")


@router.put("/reports/{report_id}")
async def update_report(report_id: str, report_update: dict):
    """
    Update an existing report
    """
    try:
        mongo = await getMongo()
        if mongo is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Check if report exists
        existing_report = await mongo.find_one("Reports", {"Report_id": report_id})
        if not existing_report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Update report
        if report_update:
            modified_count = await mongo.update_one("Reports", {"Report_id": report_id}, report_update)
            if modified_count == 0:
                raise HTTPException(status_code=500, detail="Failed to update report")
        
        # Return updated report
        updated_report = await mongo.find_one("Reports", {"Report_id": report_id})
        if "_id" in updated_report:
            updated_report["_id"] = str(updated_report["_id"])
        
        return updated_report
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating report: {str(e)}")


@router.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    """
    Delete a report
    """
    try:
        mongo = await getMongo()
        if mongo is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        deleted_count = await mongo.delete_one("Reports", {"Report_id": report_id})
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {"message": "Report deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting report: {str(e)}")


@router.get("/reports")
async def list_reports():
    """
    List all reports (with pagination)
    """
    try:
        mongo = await getMongo()
        if mongo is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        reports = await mongo.find_many("Reports", {}, limit=50)
        
        # Convert ObjectIds to strings for JSON serialization
        for report in reports:
            if "_id" in report:
                report["_id"] = str(report["_id"])
        
        return {
            "report_count": len(reports),
            "reports": reports
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing reports: {str(e)}")

