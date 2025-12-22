from fastapi import FastAPI
from bson import ObjectId
from src.db.mongoWrapper import getMongo
from bson.json_util import dumps
from src.routers import report,llmReport,user
import json

app = FastAPI()
app.include_router(report.router)
app.include_router(llmReport.router)
app.include_router(user.router)


@app.get("/test-comment")
async def test_comment():
    mongo = await getMongo()
    comment = await mongo.find_one("comments", {"_id": ObjectId("5a9427648b0beebeb69579e7")})
    return json.loads(dumps(comment)) 

