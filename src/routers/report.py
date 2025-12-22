from fastapi import APIRouter
from src.db.mongoWrapper import getMongo
from typing import Any, Dict, List, Optional
from bson import ObjectId
import json
from bson.json_util import dumps

router = APIRouter()

@router.get("/report/{report_id}")
async def get_report(report_id: str):
  mongo = await getMongo()
  report = await mongo.find_one("Reports",{"_id":ObjectId(report_id)})
  return json.loads(dumps(report)) 

@router.post("/report")
async def upload_report(report :Dict[str,Any]):
  mongo = await getMongo()
  inserted_id = await mongo.insert_one("Reports",report)
  return inserted_id

