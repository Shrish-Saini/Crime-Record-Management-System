import os
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from argon2 import PasswordHasher
from database import get_db
from routes.auth import create_access_token

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
except ImportError:
    firebase_admin = None
    firebase_auth = None

router = APIRouter(prefix="/registration", tags=["Civilian Registration"])
pwd_hasher = PasswordHasher()


def get_firebase_auth():
    if firebase_admin is None:
        raise HTTPException(
            status_code=503,
            detail="Firebase Admin SDK is not installed on the backend"
        )

    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app()
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail="Firebase Admin credentials are not configured"
            ) from exc

    return firebase_auth


class CompletePhoneRegistrationRequest(BaseModel):
    id_token: str = Field(min_length=20)
    full_name: str = Field(min_length=2, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=50)
    state: str | None = Field(default=None, max_length=50)
    pincode: str | None = Field(default=None, max_length=10)
    password: str = Field(min_length=8, max_length=128)


@router.post("/phone/complete")
def complete_phone_registration(
    payload: CompletePhoneRegistrationRequest,
    db: Session = Depends(get_db)
):
    firebase = get_firebase_auth()

    try:
        decoded = firebase.verify_id_token(payload.id_token)
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Firebase authentication token"
        ) from exc

    firebase_uid = decoded.get("uid")
    phone_number = decoded.get("phone_number")

    if not firebase_uid or not phone_number:
        raise HTTPException(
            status_code=400,
            detail="A verified Firebase phone account is required"
        )

    # Firebase has already completed the SMS OTP verification.
    # The backend never trusts a phone number supplied by the browser.
    existing = db.execute(
        text("""
            SELECT user_id
            FROM users
            WHERE firebase_uid = :firebase_uid
               OR username = :phone_number
            LIMIT 1
        """),
        {
            "firebase_uid": firebase_uid,
            "phone_number": phone_number
        }
    ).scalar()

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="A CRMS account already exists for this phone number"
        )

    password_hash = pwd_hasher.hash(payload.password)

    try:
        with db.begin():
            person_result = db.execute(
                text("""
                    INSERT INTO persons
                        (full_name, date_of_birth, gender, phone,
                         address, city, state, pincode)
                    VALUES
                        (:full_name, :date_of_birth, :gender, :phone,
                         :address, :city, :state, :pincode)
                """),
                {
                    "full_name": payload.full_name.strip(),
                    "date_of_birth": payload.date_of_birth,
                    "gender": payload.gender,
                    "phone": phone_number,
                    "address": payload.address,
                    "city": payload.city,
                    "state": payload.state,
                    "pincode": payload.pincode
                }
            )

            person_id = person_result.lastrowid

            user_result = db.execute(
                text("""
                    INSERT INTO users
                        (username, password, role, officer_id, status,
                         person_id, firebase_uid, phone_verified)
                    VALUES
                        (:username, :password, 'Civilian', NULL, 'Active',
                         :person_id, :firebase_uid, TRUE)
                """),
                {
                    "username": phone_number,
                    "password": password_hash,
                    "person_id": person_id,
                    "firebase_uid": firebase_uid
                }
            )

            user_id = user_result.lastrowid

        user = {
            "user_id": user_id,
            "username": phone_number,
            "role": "Civilian",
            "officer_id": None
        }

        token = create_access_token(user)

        return {
            "message": "Civilian account created successfully",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user_id,
                "username": phone_number,
                "role": "civilian",
                "officer_id": None,
                "person_id": person_id,
                "phone_verified": True
            }
        }

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A CRMS account or person record already exists for this phone number"
        ) from exc
