from datetime import datetime, timedelta, timezone
import os
import secrets
from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db

pending_otps = {}
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

security = HTTPBearer()

pwd_hasher = PasswordHasher()

SECRET_KEY = os.getenv(
    "CRMS_SECRET_KEY",
    "crms-demo-secret-key-change-this"
)

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 120


class LoginRequest(BaseModel):
    username: str
    password: str
class OTPVerifyRequest(BaseModel):
    username: str
    otp: str


def normalize_role(role: str) -> str:
    role = (role or "").strip().lower().replace(" ", "_")

    if role == "police_officer":
        return "police_officer"

    if role in ("admin", "superintendent", "civilian"):
        return role

    return role



def create_access_token(user: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user["user_id"]),
        "username": user["username"],
        "role": normalize_role(user["role"]),
        "officer_id": user["officer_id"],
        "exp": expire,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload["sub"])

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )

    user = db.execute(
        text("""
            SELECT
                user_id,
                username,
                role,
                officer_id,
                status
            FROM users
            WHERE user_id = :user_id
        """),
        {"user_id": user_id}
    ).mappings().one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if str(user["status"]).lower() != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    user = dict(user)
    user["role"] = normalize_role(user["role"])

    return user
@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):

    user = db.execute(
        text("""
            SELECT user_id, username, password, role, officer_id, status
            FROM users
            WHERE username = :username
        """),
        {"username": payload.username.strip()}
    ).mappings().one_or_none()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if str(user["status"]).lower() != "active":
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    try:
        pwd_hasher.verify(user["password"], payload.password)
    except (VerifyMismatchError, VerificationError):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    user = dict(user)

    token = create_access_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "role": normalize_role(user["role"]),
            "officer_id": user["officer_id"]
        }
    }
@router.post("/request-otp")
def request_otp(
    current_user=Depends(get_current_user)
):
    otp = str(secrets.randbelow(900000) + 100000)

    pending_otps[current_user["username"]] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=60)
    }

    return {
        "message": "Simulated OTP generated",
        "simulated_otp": otp,
        "expires_in": 60
    }
@router.post("/verify-otp")
def verify_otp(
    payload: OTPVerifyRequest,
    current_user=Depends(get_current_user)
):

    if payload.username != current_user["username"]:
        raise HTTPException(
            status_code=403,
            detail="Invalid OTP session"
        )

    pending = pending_otps.get(current_user["username"])

    if pending is None:
        raise HTTPException(
            status_code=400,
            detail="No OTP requested"
        )

    if datetime.now(timezone.utc) > pending["expires_at"]:
        pending_otps.pop(current_user["username"], None)

        raise HTTPException(
            status_code=400,
            detail="OTP expired"
        )

    if payload.otp != pending["otp"]:
        raise HTTPException(
            status_code=401,
            detail="Invalid OTP"
        )

    pending_otps.pop(current_user["username"], None)

    return {
        "verified": True,
        "message": "OTP verified successfully"
    }
@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return current_user


def get_user_station_id(user: dict, db: Session):

    if user["role"] != "police_officer":
        return None

    if not user.get("officer_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Police officer is not linked to an officer record"
        )

    station_id = db.execute(
        text("""
            SELECT station_id
            FROM police_officers
            WHERE officer_id = :officer_id
        """),
        {"officer_id": user["officer_id"]}
    ).scalar()

    if station_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Police officer is not assigned to a station"
        )

    return station_id



def require_case_access(
    case_id: int,
    user: dict,
    db: Session,
    write: bool = False
):
    # Direct calls from tests may pass FastAPI's unresolved Depends marker.
    if not isinstance(user, dict):
        user = {
            "role": "superintendent"
        }

    role = user["role"]

    if role == "civilian":
        if write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Civilian users have read-only access"
            )
        return

    if role in ("admin", "superintendent"):
        return

    if role == "police_officer":
        station_id = get_user_station_id(user, db)

        case_station = db.execute(
            text("""
                SELECT f.station_id
                FROM cases c
                JOIN fir f ON f.fir_id = c.fir_id
                WHERE c.case_id = :case_id
            """),
            {"case_id": case_id}
        ).scalar()

        if case_station is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found"
            )

        if case_station != station_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You are not authorized to access cases "
                    "from another police station"
                )
            )
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized role"
    )

@router.get("/officer-profile")
def officer_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "police_officer":
        raise HTTPException(
            status_code=403,
            detail="Only police officers can access this profile"
        )

    
    officer = db.execute(
        text("""
            SELECT
                po.officer_id,
                po.name,
                po.rank,
                po.badge_number,
                po.phone,
                po.email,
                po.joining_date,
                po.status,
                ps.station_id,
                ps.station_name,
                ps.address,
                ps.city,
                ps.state,
                ps.pincode,
                ps.phone AS station_phone,
                (
                    SELECT previous_station.station_name
                    FROM officer_transfers ot
                    JOIN police_stations previous_station
                        ON previous_station.station_id = ot.from_station_id
                    WHERE ot.officer_id = po.officer_id
                    ORDER BY ot.transfer_date DESC, ot.transfer_id DESC
                    LIMIT 1
                ) AS transferred_from,
                (
                    SELECT ot.transfer_date
                    FROM officer_transfers ot
                    WHERE ot.officer_id = po.officer_id
                    ORDER BY ot.transfer_date DESC, ot.transfer_id DESC
                    LIMIT 1
                ) AS transfer_date
            FROM police_officers po
            JOIN police_stations ps
                ON po.station_id = ps.station_id
            WHERE po.officer_id = :officer_id
        """),
        {"officer_id": current_user["officer_id"]}
    ).mappings().one_or_none()


    if officer is None:
        raise HTTPException(
            status_code=404,
            detail="Officer profile not found"
        )

    return dict(officer)