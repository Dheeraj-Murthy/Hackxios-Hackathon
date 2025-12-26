from fastapi import APIRouter
from src.db.mongoWrapper import getMongo
from typing import Any, Dict, List, Optional
from bson import ObjectId
import json
from bson.json_util import dumps
from datetime import datetime

from src.llm_agent import LLMReportAgent
from src.schemas import ReportModel

router = APIRouter()


@router.get("/LLMReport/{report_id}")
async def get_report(report_id: str):
  mongo = await getMongo()
  report = await mongo.find_one("LLMReports", {"_id": ObjectId(report_id)})
  return json.loads(dumps(report)) 


@router.post("/LLMReport")
async def upload_report(report: ReportModel):
  mongo = await getMongo()

  patient_id = report.model_dump().get("patient_id")
  report_id = report.model_dump().get("report_id")
  time = report.model_dump().get("time") or datetime.utcnow().isoformat()
  
  user = None
  if patient_id:
    try:
      user = await mongo.find_one("Users", {"_id": ObjectId(patient_id)})
    except Exception:
      user = None

  if user:
    favorites = user.get("Favorites") or []
    biodata = user.get("BioData") or {}
  else:
    favorites = []
    biodata = {}

  
  input_parsed = report.model_dump().get("Attributes")
  if not input_parsed:
    return {"error": "Attributes missing"}
  
  try:
    agent = LLMReportAgent()
    agent_input = {
      "report_id": report_id,
      "patient_id": patient_id,
      "time": time,
      "input": input_parsed,
      "favorites": favorites,
      "biodata": biodata,
    }
    analysis = await agent.analyze(agent_input)

  except Exception as e:
    analysis = {"error": "agent_failed", "message": str(e)}

  llm_doc = {
    "patient_id": patient_id,
    "report_id": report_id,
    "time":datetime.utcnow.isoformat(),
    "output": analysis,
    "input" : input_parsed,
  }

  llm_inserted = await mongo.insert_one("LLMReports", llm_doc)

  # adding selected suggestion(s) to user favorites
  try:
      selected_suggestions = (
          report.model_dump().get("selected_suggestions")
          or (
              [report.model_dump().get("selected_suggestion")]
              if report.model_dump().get("selected_suggestion")
              else []
          )
      )
  
      if patient_id and selected_suggestions:
          await mongo.update_one(
              "Users",
              {"_id": ObjectId(patient_id)},
              {
                  "$addToSet": {
                      "Favorites": {
                          "$each": selected_suggestions
                      }
                  }
              }
          )
  except Exception:
      pass
    


  # adding llm report id to report document
  try:
    if report_id:
      await mongo.update_one("Reports", {"_id": ObjectId(report_id)}, {"llm_report_id": llm_inserted})
  except Exception:
    pass

  return {"llm_report_id": llm_inserted, "analysis": analysis}

