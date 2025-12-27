from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from bson import ObjectId


class UserModel(BaseModel):
    name: Optional[str] = None
    Access : List[str] = []
    Favorites: List[str] = []
    BioData: Dict[str, Any] = {}
    Reports : List[str] = []
    model_config = ConfigDict(extra="allow")


class ReportModel(BaseModel):
    patient_id: Optional[str]
    report_id: Optional[str] = None
    time: Optional[str] = None
    Attributes : Optional[Dict[str, Any]] = None
    llm_report_id : Optional[str] = None
    selected_concerns: Optional[List[str]] = None #New field which will be added further in favourites
    model_config = ConfigDict(extra="allow")


class LLMReportModel(BaseModel):
    patient_id: Optional[str]
    report_id: Optional[str]
    time: Optional[str] = None
    output: Dict[str, Any]
    input : Dict[str,Any]
    model_config = ConfigDict(extra="allow")

class MetricData(BaseModel):
    name: Optional[str] = None
    value: Optional[str] = None
    remark: Optional[str] = None
    range: Optional[str] = None
    unit: Optional[str] = None
    verdict: Optional[str] = None  # To be filled later


class Report(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    Report_id: str = Field(..., description="Unique report identifier")
    Patient_id: str = Field(..., description="Patient identifier")
    Processed_at: datetime = Field(default_factory=datetime.utcnow)
    Attributes: Dict[str, MetricData] = Field(..., description="Medical test results")
    llm_output: Optional[str] = Field(None, description="LLM-generated health assessment")
    llm_report_id: Optional[str] = Field(None, description="Reference to LLM analysis report")

    class Config:
        populate_by_name = True


class ReportCreate(BaseModel):
    Report_id: str
    Patient_id: str
    Attributes: Dict[str, MetricData]
    llm_output: Optional[str] = None


class ReportUpdate(BaseModel):
    Patient_id: Optional[str] = None
    Attributes: Optional[Dict[str, MetricData]] = None
    llm_output: Optional[str] = None


#Authentication
class OnboardRequest(BaseModel):
	role : str  #"individual" or "hospital"
