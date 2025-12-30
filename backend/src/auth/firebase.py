import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()

# Lazy / tolerant Firebase initialization
FIREBASE_KEY_PATH = os.environ.get("FIREBASE_ADMIN_KEY")
_firebase_initialized = False

if FIREBASE_KEY_PATH:
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(FIREBASE_KEY_PATH)
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
    except Exception as e:
        # Don't crash the app at import time; warn and keep service running.
        # Verification will fail later with a clear HTTP error.
        print(f"Warning: failed to initialize Firebase admin SDK: {e}")
        _firebase_initialized = False
else:
    print("Warning: FIREBASE_ADMIN_KEY not set; Firebase auth is disabled.")


def verify_firebase_token(token: str):
    # If Firebase admin SDK wasn't initialized, return an appropriate HTTP error
    if not _firebase_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase admin SDK not configured on server"
        )

    try:
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email")
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token"
        )
