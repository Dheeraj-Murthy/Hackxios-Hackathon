from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


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
    Attibutes : Optional[str] = None
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




#Authentication
class OnboardRequest(BaseModel):
	role : str  #"individual" or "hospital"
