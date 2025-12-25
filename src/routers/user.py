from fastapi import APIRouter
from src.db.mongoWrapper import getMongo
from typing import Any, Dict, List, Optional
from bson import ObjectId
import json
from bson.json_util import dumps

from src.schemas import UserModel

router = APIRouter()


@router.get("/user/{user_id}")
async def get_user(user_id: str):
  mongo = await getMongo()
  report = await mongo.find_one("Users", {"_id": ObjectId(user_id)})
  return json.loads(dumps(report)) 


@router.post("/user")
async def upload_user(user: UserModel):
  mongo = await getMongo()
  # store the user document as a dict
  inserted_id = await mongo.insert_one("Users", user.model_dump())
  return inserted_id


