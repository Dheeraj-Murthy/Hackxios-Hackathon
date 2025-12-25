from fastapi import APIRouter
from src.db.mongoWrapper import getMongo
from typing import Any, Dict, List, Optional
from bson import ObjectId
import json
from bson.json_util import dumps
from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.schemas import UserModel, OnboardRequest

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


@router.get("/me")
def read_me(current_user = Depends(get_current_user)):
	return {
		"uid": current_user["uid"],
		"email": current_user["email"],
		"role": None #frontend decides
	}


@router.post("/user/onboard")
async def onboard_user(
    data: OnboardRequest,
    current_user = Depends(get_current_user)
):
    return {
	"message": "Auth works. ONboarding will be enabled once DB is configures",
	"uid": current_user["uid"],
	"email": current_user["email"],
	"requested_role": data.role
	} 

