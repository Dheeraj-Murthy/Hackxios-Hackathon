from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.auth.dependencies import get_current_user
from src.llm_agent import LLMReportAgent
from src.db.mongoWrapper import getMongo
from src.llm_chat import generate_chat_response

router = APIRouter(prefix="/api", tags=["Chat"])

class ChatMessage(BaseModel):
  from_user: str
  text: str

class ChatRequest(BaseModel):
  message: str
  user_id: str
  conversation_history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
  response: str
  timestamp: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
  request: ChatRequest,
  current_user=Depends(get_current_user)
):
  """
    Chat endpoint for interacting with LLM about health reports
    """
  try:
    #   # Verify the user_id matches current user
    #   if request.user_id != current_user["uid"]:
    #     raise HTTPException(status_code=403, detail="Unauthorized")


    # Prepare context from conversation history
    context = {
      "user_id": current_user["uid"],
      "user_email": current_user["email"],
      "current_message": request.message,
      "conversation_history": request.conversation_history or [],
    }

    # Fetch user's recent reports for context
    mongo = await getMongo()
    user_reports = await mongo.find_many(
      "Reports", 
      {"Patient_id": current_user["uid"]}, 
      limit=3
    )

    if user_reports:
      context["recent_reports"] = user_reports

      # Generate response using LLM agent
      # For now, we'll use a simple chat response
      # In production, this would integrate with the LLM agent's chat capabilities

      # Simple rule-based responses for common health questions
      # response = generate_health_response(request.message, context)
      response = generate_chat_response(context)
      from datetime import datetime, UTC
      timestamp = datetime.now(UTC).isoformat()

      return ChatResponse(
        response=response,
        timestamp=timestamp
      )
    
    else : 
      from datetime import datetime, UTC
      timestamp = datetime.now(UTC).isoformat()
      return ChatResponse(
        response="You have not uploaded any medical reports yet. Please upload your reports to have personalized query responses on analysis.",
        timestamp=timestamp
      )

  except Exception as e:
    raise HTTPException(
      status_code=500,
      detail=f"Chat service error: {str(e)}"
    )

def generate_health_response(message: str, context: dict) -> str:
  """
    Generate appropriate health-related responses
    This is a simplified implementation - in production, use the actual LLM agent
    """
  message_lower = message.lower()

  # Basic health information responses
  if "vitamin d" in message_lower:
    return "Vitamin D is essential for bone health and immune function. Normal levels are typically 30-50 ng/mL. Low levels can be improved through sunlight exposure and vitamin D-rich foods like fatty fish and fortified dairy products."

  elif "hemoglobin" in message_lower:
    return "Hemoglobin is a protein in red blood cells that carries oxygen. Normal ranges are typically 13.5-17.5 g/dL for men and 12.0-15.5 g/dL for women. Low levels may indicate anemia, while high levels could suggest dehydration or other conditions."

  elif "glucose" in message_lower or "blood sugar" in message_lower:
    return "Normal fasting blood glucose levels are typically 70-100 mg/dL. Levels above 126 mg/dL may indicate diabetes. Regular monitoring, a balanced diet, and exercise can help maintain healthy blood sugar levels."

  elif "report" in message_lower or "upload" in message_lower:
    return "You can upload your medical reports on the Upload Report page. I'll analyze them and provide personalized insights about your biomarkers and health status."

  elif "diet" in message_lower or "nutrition" in message_lower:
    return "A balanced diet rich in fruits, vegetables, whole grains, and lean proteins supports overall health. Based on your specific reports, I can provide more targeted nutritional recommendations."

  elif "exercise" in message_lower or "physical activity" in message_lower:
    return "Regular physical activity (150 minutes of moderate exercise per week) helps maintain cardiovascular health, manage weight, and improve overall wellbeing. Always consult your healthcare provider before starting new exercise routines."

  elif "symptom" in message_lower:
    return "I can help interpret your lab results and biomarkers, but I cannot diagnose symptoms. For specific medical symptoms, please consult with a healthcare professional who can provide proper medical evaluation."

  elif "normal range" in message_lower or "reference" in message_lower:
    return "Normal ranges vary by laboratory, age, and gender. When you upload your reports, I'll provide specific interpretations based on your individual results and the reference ranges used by your testing facility."

  else:
    return "I'm here to help you understand your health reports and biomarkers. You can ask me about specific lab results, general health information, or request interpretations of your uploaded reports. For medical emergencies, please contact emergency services immediately."
