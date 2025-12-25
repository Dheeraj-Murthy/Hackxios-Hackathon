from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.auth.firebase import verify_firebase_token

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    return verify_firebase_token(token)

