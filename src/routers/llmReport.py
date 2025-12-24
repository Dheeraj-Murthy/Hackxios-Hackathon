from fastapi import APIRouter
from src.db.mongoWrapper import getMongo
from typing import Any, Dict, List, Optional
from bson import ObjectId
import json
from bson.json_util import dumps
from datetime import datetime

from src.llm_agent import LLMReportAgent

router = APIRouter()


@router.get("/LLMReport/{report_id}")
async def get_report(report_id: str):
  mongo = await getMongo()
  report = await mongo.find_one("LLMReports", {"_id": ObjectId(report_id)})
  return json.loads(dumps(report)) 



@router.post("/LLMReport")
async def upload_report(report :Dict[str,Any]):
  mongo = await getMongo()

  patient_id = report.get("patient_id")
  report_id = report.get("report_id")
  time = report.get("time") or datetime.utcnow().isoformat()
  
  user = await mongo.find_one("Users", {"_id": ObjectId(patient_id)})

  if user:
    favorites = user.get("Favorites") or []
    biodata = user.get("BioData") or {}
  else:
    favorites = []
    biodata = {}


  # function that returns input parsed
  input = {}
  try:
    agent = LLMReportAgent()
    agent_input = {
      "report_id": report_id,
      "patient_id": patient_id,
      "time": time,
      "input": input,
      "favorites": favorites,
      "biodata": biodata,
    }
    analysis = await agent.analyze(agent_input)

  except Exception as e:
    analysis = {"error": "agent_failed", "message": str(e)}

  llm_doc = {
    "patient_id": patient_id,
    "report_id": report_id,
    "time": time,
    "output": analysis,
    "created_at": datetime.utcnow().isoformat(),
  }

  llm_inserted = await mongo.insert_one("LLMReports", llm_doc)

  # analysis will have have suggested favorites if user selects one we will update user favorites 

  return {"llm_report_id": llm_inserted, "analysis": analysis}

