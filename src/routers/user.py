from fastapi import APIRouter, Depends
from src.db.mongoWrapper import getMongo
from bson import ObjectId
from bson.json_util import dumps
import json

from src.auth.dependencies import get_current_user
from src.schemas import PatientModel, OnboardRequest

router = APIRouter()

@router.get("/user/me")
async def get_me(current_user = Depends(get_current_user)):
    mongo = await getMongo()

    user = await mongo.find_one(
        "Users",
        {"uid": current_user["uid"]}
    )

    if not user:
        return {}

    return json.loads(dumps(user))


@router.get("/user/{user_id}")
async def get_user(user_id: str):
    mongo = await getMongo()
    user = await mongo.find_one("Users", {"_id": ObjectId(user_id)})
    return json.loads(dumps(user))


@router.post("/user")
async def upload_user(
    user: PatientModel,
    current_user = Depends(get_current_user)
):
    mongo = await getMongo()
    user_dict = user.model_dump()
    user_dict["uid"] = current_user["uid"]
    user_dict["user_type"] = "patient"
    inserted_id = await mongo.insert_one("Users", user_dict)
    return { "_id": str(inserted_id) }


@router.get("/me")
def read_me(current_user = Depends(get_current_user)):
    return {
        "uid": current_user["uid"],
        "email": current_user["email"],
        "role": None  # frontend decides
    }


@router.post("/user/onboard")
async def onboard_user(
    data: OnboardRequest,
    current_user = Depends(get_current_user)
):
    return {
        "message": "Auth works. Onboarding will be enabled once DB is configured",
        "uid": current_user["uid"],
        "email": current_user["email"],
        "requested_role": data.role
    }

@router.patch("/user/me")
async def update_me(
    data: dict,
    current_user = Depends(get_current_user)
):
    mongo = await getMongo()

    uid = current_user["uid"]

    update_doc = {}

    # 1. Move name to root
    if "name" in data:
        update_doc["name"] = data.pop("name")

    # 2. Everything else goes into BioData
    if data:
        update_doc["BioData"] = data

    result = await mongo.update_one(
        "Users",
        {"uid": uid},
        update_doc
    )

    return {
        "modified": result
    }

