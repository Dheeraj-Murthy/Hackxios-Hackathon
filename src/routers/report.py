from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import json
from datetime import datetime
from bson import ObjectId
from bson.json_util import dumps

from src.db.mongoWrapper import getMongo
from src.schemas import ReportModel
from src.utils.file_handler import FileHandler
from src.llm_agent import LLMReportAgent

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


# Internal helper functions for orchestration
async def _upload_and_parse_report(
    file: UploadFile, 
    patient_id: Optional[str], 
    report_id: Optional[str]
) -> dict:
    """Internal function to handle file upload and parsing"""
    file_path = None
    csv_file_path = None
    processed_csv_path = None
    
    try:
        # Save uploaded file
        file_id, file_path = await file_handler.save_upload_file(file)
        
        # Generate patient ID if not provided or empty
        if not patient_id or patient_id.strip() == "":
            patient_id = f"patient_{file_id[:8]}"
        
        # Generate report ID if not provided or empty
        if not report_id or report_id.strip() == "":
            report_id = f"report_{file_id[:8]}"
        
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
        processed_csv_path = csv_parsing_result.get("processed_file")
        
        # Create attributes dictionary with CSV data (all 4 columns)
        parsed_attributes = {}
        for i, test in enumerate(csv_data, 1):
            key = f"test_{i}"
            parsed_attributes[key] = test
        
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
        
        return {
            "report_id": report_id,
            "patient_id": patient_id,
            "tests_stored": len(parsed_attributes),
            "id": result_id,
            "attributes": parsed_attributes,
            "file_id": file_id,
            "file_path": file_path,
            "csv_path": csv_file_path
        }
        
    finally:
        # Clean up temporary files
        if file_path:
            file_handler.delete_file(file_path)
        if csv_file_path and os.path.exists(csv_file_path):
            os.remove(csv_file_path)
        if processed_csv_path and os.path.exists(processed_csv_path):
            os.remove(processed_csv_path)
        
        # Additional cleanup: remove any processed CSV files that might be left behind
        # Use pattern matching to clean up any _processed.csv files related to this file_id
        if 'file_id' in locals():
            import glob
            processed_pattern = os.path.join(os.path.dirname(csv_file_path or ""), f"{file_id}_*_processed.csv")
            for processed_file in glob.glob(processed_pattern):
                try:
                    os.remove(processed_file)
                    print(f"Cleaned up extra processed file: {processed_file}")
                except Exception as e:
                    print(f"Failed to clean up {processed_file}: {e}")

async def _analyze_report_data(
    patient_id: str, 
    report_id: str, 
    attributes: dict
) -> dict:
    """Internal function to handle LLM analysis"""
    try:
        agent = LLMReportAgent()
        agent_input = {
            "report_id": report_id,
            "patient_id": patient_id,
            "input": attributes,
            "favorites": [],
            "biodata": {},
        }
        analysis = await agent.analyze(agent_input)
        
        # Store LLM result
        mongo = await getMongo()
        if mongo is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        from datetime import datetime
        llm_doc = {
            "patient_id": patient_id,
            "report_id": report_id,
            "time": datetime.utcnow().isoformat(),
            "output": analysis,
            "input": attributes,
        }
        
        llm_report_id = await mongo.insert_one("LLMReports", llm_doc)
        
        # Update original report with LLM reference
        if report_id:
            await mongo.update_one("Reports", {"Report_id": report_id}, {"llm_report_id": llm_report_id})
        
        return {
            "llm_report_id": llm_report_id,
            "analysis": analysis
        }
        
    except Exception as e:
        return {
            "error": "llm_analysis_failed",
            "message": str(e),
            "llm_report_id": None,
            "analysis": None
        }

async def _update_report_with_llm(report_id: str, llm_report_id: str):
    """Internal function to update report with LLM reference"""
    try:
        mongo = await getMongo()
        if mongo:
            await mongo.update_one("Reports", {"Report_id": report_id}, {"llm_report_id": llm_report_id})
    except Exception as e:
        print(f"Failed to update report with LLM reference: {e}")

@router.post("/reports/upload")
async def upload_report(
    file: UploadFile = File(...), 
    patient_id: Optional[str] = Form(None), 
    report_id: Optional[str] = Form(None)
):
    """
    Upload and process a medical report PDF
    """
    
    file_path = None
    csv_file_path = None
    processed_csv_path = None
    
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
        processed_csv_path = csv_parsing_result.get("processed_file")
        csv_data = csv_parsing_result.get("data", [])
        
        # Create attributes dictionary with CSV data (all 4 columns)
        parsed_attributes = {}
        for i, test in enumerate(csv_data, 1):
            key = f"test_{i}"
            parsed_attributes[key] = test
        
        # Generate patient ID if not provided or empty
        if not patient_id or patient_id.strip() == "":
            patient_id = f"patient_{file_id[:8]}"
        
        # Generate report ID if not provided or empty
        if not report_id or report_id.strip() == "":
            report_id = f"report_{file_id[:8]}"
        
        report_data = {
            "Report_id": report_id,
            "Patient_id": patient_id,
            "Attributes": parsed_attributes,
            "Processed_at": datetime.utcnow().isoformat()
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
        if processed_csv_path and os.path.exists(processed_csv_path):
            os.remove(processed_csv_path)
        
        return {
            "message": "Report uploaded and processed successfully",
            "report_id": report_id,
            "patient_id": patient_id,
            "tests_stored": len(parsed_attributes),
            "id": result_id
        }
        
    except HTTPException:
        # Clean up file on HTTP errors
        if 'file_path' in locals() and file_path is not None:
            file_handler.delete_file(file_path)
        if 'csv_file_path' in locals() and csv_file_path and os.path.exists(csv_file_path):
            os.remove(csv_file_path)
        if 'processed_csv_path' in locals() and processed_csv_path and os.path.exists(processed_csv_path):
            os.remove(processed_csv_path)
        raise
    except Exception as e:
        # Clean up file on general errors
        if 'file_path' in locals() and file_path is not None:
            file_handler.delete_file(file_path)
        if 'csv_file_path' in locals() and csv_file_path and os.path.exists(csv_file_path):
            os.remove(csv_file_path)
        if 'processed_csv_path' in locals() and processed_csv_path and os.path.exists(processed_csv_path):
            os.remove(processed_csv_path)
        raise HTTPException(status_code=500, detail=f"Error processing report: {str(e)}")


@router.post("/reports/upload-and-analyze")
async def upload_and_analyze(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    report_id: Optional[str] = Form(None),
    auto_analyze: bool = Form(True)  # Allow disable for testing
):
    """
    Upload, process, and automatically analyze a medical report PDF in one atomic operation
    """
    try:
        # Step 1: Upload and parse the report
        upload_result = await _upload_and_parse_report(file, patient_id, report_id)
        
        if not auto_analyze:
            return {
                "message": "Report uploaded successfully (auto-analysis disabled)",
                "report_id": upload_result["report_id"],
                "patient_id": upload_result["patient_id"],
                "tests_stored": upload_result["tests_stored"],
                "llm_analysis_complete": False,
                "id": upload_result["id"]
            }
        
        # Step 2: Perform LLM analysis
        llm_result = await _analyze_report_data(
            upload_result["patient_id"],
            upload_result["report_id"], 
            upload_result["attributes"]
        )
        
        if llm_result.get("error"):
            # LLM failed but upload succeeded
            return {
                "message": "Report uploaded successfully, but LLM analysis failed",
                "report_id": upload_result["report_id"],
                "patient_id": upload_result["patient_id"],
                "tests_stored": upload_result["tests_stored"],
                "llm_analysis_complete": False,
                "llm_error": llm_result.get("message"),
                "id": upload_result["id"]
            }
        
        # Step 3: Update original report with LLM reference
        await _update_report_with_llm(upload_result["report_id"], llm_result["llm_report_id"])
        
        # Step 4: Return unified response
        return {
            "message": "Report uploaded and analyzed successfully",
            "report_id": upload_result["report_id"],
            "patient_id": upload_result["patient_id"],
            "tests_stored": upload_result["tests_stored"],
            "llm_analysis_complete": True,
            "llm_report_id": llm_result["llm_report_id"],
            "llm_analysis": llm_result["analysis"],
            "id": upload_result["id"]
        }
        
    except HTTPException:
        # Clean up file on HTTP errors
        if 'file_path' in locals() and file_path is not None:
            file_handler.delete_file(file_path)
        if 'processed_csv_path' in locals() and processed_csv_path and os.path.exists(processed_csv_path):
            os.remove(processed_csv_path)
        if 'csv_file_path' in locals() and csv_file_path and os.path.exists(csv_file_path):
            os.remove(csv_file_path)
        raise
    except Exception as e:
        if 'processed_csv_path' in locals() and processed_csv_path and os.path.exists(processed_csv_path):
            os.remove(processed_csv_path)
        # Clean up file on general errors
        if 'file_path' in locals() and file_path is not None:
            file_handler.delete_file(file_path)
        if 'csv_file_path' in locals() and csv_file_path and os.path.exists(csv_file_path):
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

