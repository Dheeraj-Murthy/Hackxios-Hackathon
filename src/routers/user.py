from fastapi import APIRouter, Depends, HTTPException
from src.db.mongoWrapper import getMongo
from bson import ObjectId
from bson.json_util import dumps
import json

from src.auth.dependencies import get_current_user
from src.schemas import OnboardRequest

router = APIRouter()

# CURRENT USER
@router.get("/me")
async def read_me(current_user=Depends(get_current_user)):
    mongo = await getMongo()

    user = await mongo.find_one(
        "Users",
        {"uid": current_user["uid"]}
    )

    return {
        "uid": current_user["uid"],
        "email": current_user["email"],
        "role": user.get("user_type") if user else None
    }


# CREATE USER (PATIENT / INSTITUTION)
@router.post("/user")
async def upload_user(
    data: dict,
    current_user=Depends(get_current_user)
):
    mongo = await getMongo()

    user_type = data.get("user_type")
    if user_type not in ["patient", "institution"]:
        raise HTTPException(status_code=400, detail="Invalid user_type")

    existing = await mongo.find_one("Users", {"uid": current_user["uid"]})
    if existing:
        return {
            "_id": str(existing["_id"]),
            "user_type": existing["user_type"]
        }

    user_doc = {
        "uid": current_user["uid"],
        "email": current_user["email"],
        "user_type": user_type,
    }

    if user_type == "patient":
        user_doc.update({
            "name": "",
            "BioData": {},
            "Favorites": [],
            "Reports": [],
        })

    if user_type == "institution":
        user_doc.update({
            "institution_name": "",
        })

    inserted_id = await mongo.insert_one("Users", user_doc)

    return {
        "_id": str(inserted_id),
        "user_type": user_type
    }


# UPDATE PATIENT PROFILE
@router.patch("/user/me")
async def update_me(
    data: dict,
    current_user=Depends(get_current_user)
):
    mongo = await getMongo()

    user = await mongo.find_one(
        "Users",
        {"uid": current_user["uid"]}
    )

    if not user or user.get("user_type")!= "patient":
        raise HTTPException(
            status_code=403,
            detail="Only patients can update profile"
        )

    update_doc = {}

    if "name" in data:
        update_doc["name"] = data.pop("name")

    if data:
        update_doc["BioData"] = data

    await mongo.update_one(
        "Users",
        {"uid": current_user["uid"]},
        update_doc
    )

    return {"status": "updated"}


# GET USER BY ID
@router.get("/user/{user_id}")
async def get_user(user_id: str):
    mongo = await getMongo()
    user = await mongo.find_one("Users", {"_id": ObjectId(user_id)})
    return json.loads(dumps(user))


# HOSPITAL → APPROVED PATIENTS
@router.get("/hospital/patients")
async def get_hospital_patients(
    current_user=Depends(get_current_user)
):
    mongo = await getMongo()

    # Ensure hospital
    hospital = await mongo.find_one(
        "Users",
        {"uid": current_user["uid"], "user_type": "institution"}
    )

    if not hospital:
        return []

    # Fetch approved access requests
    requests = await mongo.find_many(
        "AccessRequests",
        {
            "hospital_uid": current_user["uid"],
            "status": "approved"
        }
    )

    patient_emails = [r["patient_email"] for r in requests]

    if not patient_emails:
        return []

    patients = await mongo.find_many(
        "Users",
        {
            "user_type": "patient",
            "email": {"$in": patient_emails}
        }
    )

    for p in patients:
        p["_id"] = str(p["_id"])
    print("FETCH HOSPITAL UID:", current_user["uid"])

    return patients



# HOSPITAL → VIEW A SPECIFIC PATIENT (READ ONLY)
@router.get("/hospital/patient/{patient_uid}")
async def get_patient_for_hospital(
    patient_uid: str,
    current_user=Depends(get_current_user)
):
    mongo = await getMongo()

    # 1. Ensure requester is a hospital
    hospital = await mongo.find_one(
        "Users",
        {"uid": current_user["uid"], "user_type": "institution"}
    )
    if not hospital:
        raise HTTPException(status_code=403, detail="Not a hospital")

    # 2. Get patient user
    patient = await mongo.find_one(
        "Users",
        {"uid": patient_uid, "user_type": "patient"}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 3. Check approved access
    access = await mongo.find_one(
        "AccessRequests",
        {
            "hospital_uid": current_user["uid"],
            "patient_email": patient["email"],
            "status": "approved"
        }
    )
    if not access:
        raise HTTPException(status_code=403, detail="Access not approved")

    # 4. Return patient data (safe fields only)
    patient["_id"] = str(patient["_id"])

    return {
        "uid": patient["uid"],
        "email": patient.get("email"),
        "name": patient.get("name", ""),
        "BioData": patient.get("BioData", {}),
        "Reports": patient.get("Reports", [])
    }
