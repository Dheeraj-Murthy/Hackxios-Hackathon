from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from src.db.mongoWrapper import getMongo
from src.auth.dependencies import get_current_user

router = APIRouter(prefix="/access")

# Hospital → request access
@router.post("/request")
async def request_access(data: dict, current_user=Depends(get_current_user)):
    mongo = await getMongo()

    doc = {
        "hospital_uid": current_user["uid"],
        "patient_email": data["email"],
        "status": "pending",
        "created_at": datetime.utcnow(),
    }

    await mongo.insert_one("AccessRequests", doc)
    return {"status": "pending"}


# Patient → list pending requests
@router.get("/my-requests")
async def my_requests(current_user=Depends(get_current_user)):
    mongo = await getMongo()

    requests = await mongo.find_many(
        "AccessRequests",
        {
            "patient_email": current_user["email"],
            "status": "pending",
        },
    )

    # convert ObjectId → str
    for r in requests:
        r["_id"] = str(r["_id"])

    return requests


# Patient → approve / reject
@router.post("/respond")
async def respond_request(data: dict, current_user=Depends(get_current_user)):
    mongo = await getMongo()

    request_id = data.get("request_id")
    action = data.get("action")

    if action not in ["approve", "reject"]:
        raise HTTPException(400, "Invalid action")

    request = await mongo.find_one(
        "AccessRequests",
        {"_id": ObjectId(request_id), "patient_email": current_user["email"]},
    )

    if not request:
        raise HTTPException(404, "Request not found")

    # Update request status
    await mongo.update_one(
        "AccessRequests",
        {"_id": ObjectId(request_id)},
        {"status": action},
    )

    # IF APPROVED → LINK PATIENT TO HOSPITAL
    if action == "approve":
        await mongo.update_one(
            "Users",
            {"uid": request["hospital_uid"]},
            {"$addToSet": {"patient_list": current_user["uid"]}},
        )

    return {"status": action}
