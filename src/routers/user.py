from fastapi import APIRouter
from src.db.mongoWrapper import getMongo
from typing import Any, Dict, List, Optional
from bson import ObjectId
import json
from bson.json_util import dumps

router = APIRouter()

@router.get("/user/{user_id}")
async def get_report(user_id: str):
  mongo = await getMongo()
  report = await mongo.find_one("Users",{"_id":ObjectId(user_id)})
  return json.loads(dumps(report)) 

@router.post("/user")
async def upload_report(user :Dict[str,Any]):
  mongo = await getMongo()
  inserted_id = await mongo.insert_one("Users",user)
  return inserted_id


