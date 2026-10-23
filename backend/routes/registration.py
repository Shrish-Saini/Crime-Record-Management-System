
import hashlib
import hmac
import os
import re
import secrets
import smtplib
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from threading import Lock

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from argon2 import PasswordHasher

from database import get_db
from routes.auth import create_access_token, normalize_role

load_dotenv()

router = APIRouter(prefix="/registration", tags=["Civilian Registration"])
pwd_hasher = PasswordHasher()

OTP_EXPIRE_SECONDS = int(os.getenv("OTP_EXPIRE_SECONDS", "300"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))

# Demo storage. Challenges are cleared after successful registration.
pending_registrations = {}
otp_lock = Lock()


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 50 or not re.fullmatch(
        r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+",
        email,
    ):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address of at most 50 characters.",
        )
    return email


def send_email_otp(destination: str, otp: str) -> None:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "465"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("OTP_FROM_EMAIL") or username

    if not username or not password or not sender:
        raise HTTPException(
            status_code=503,
            detail="Email service is not configured. Check backend/.env.",
        )

    message = EmailMessage()
    message["Subject"] = "CRMS Civilian Registration OTP"
    message["From"] = sender
    message["To"] = destination
    message.set_content(
        f"Your Crime Record Management System verification code is {otp}.\n\n"
        f"This code expires in {OTP_EXPIRE_SECONDS // 60} minutes. "
        "If you did not request this code, you can ignore this email."
    )

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                server.login(username, password)
                server.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.starttls()
                server.login(username, password)
                server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to send email. Check SMTP settings and try again.",
        ) from exc


class SendEmailOTPRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class VerifyEmailOTPRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    otp: str = Field(pattern=r"^\d{6}$")


class CompleteEmailRegistrationRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    registration_token: str = Field(min_length=32, max_length=128)
    full_name: str = Field(min_length=2, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=50)
    state: str | None = Field(default=None, max_length=50)
    pincode: str | None = Field(default=None, max_length=10)
    password: str = Field(min_length=8, max_length=128)


@router.post("/email/send-otp")
def send_registration_otp(
    payload: SendEmailOTPRequest,
    db: Session = Depends(get_db),
):
    email = normalize_email(payload.email)

    existing = db.execute(
        text("""
            SELECT user_id
            FROM users
            WHERE email = :email OR username = :email
            LIMIT 1
        """),
        {"email": email},
    ).scalar()

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="An account already exists for this email address.",
        )

    now = datetime.now(timezone.utc)

    with otp_lock:
        previous = pending_registrations.get(email)
        if previous and now < previous["resend_after"]:
            raise HTTPException(
                status_code=429,
                detail="Please wait before requesting another OTP.",
            )

    otp = f"{secrets.randbelow(1_000_000):06d}"

    # Send first so a failed email does not leave an unusable challenge.
    send_email_otp(email, otp)

    with otp_lock:
        pending_registrations[email] = {
            "otp_hash": hashlib.sha256(otp.encode()).hexdigest(),
            "expires_at": now + timedelta(seconds=OTP_EXPIRE_SECONDS),
            "resend_after": now + timedelta(seconds=60),
            "attempts": 0,
            "verified": False,
            "registration_token": None,
        }

    return {
        "message": "Verification code sent to your email.",
        "expires_in": OTP_EXPIRE_SECONDS,
    }


@router.post("/email/verify-otp")
def verify_registration_otp(payload: VerifyEmailOTPRequest):
    email = normalize_email(payload.email)
    now = datetime.now(timezone.utc)

    with otp_lock:
        pending = pending_registrations.get(email)

        if pending is None:
            raise HTTPException(
                status_code=400,
                detail="No active OTP request. Please request a new code.",
            )

        if now >= pending["expires_at"]:
            pending_registrations.pop(email, None)
            raise HTTPException(
                status_code=400,
                detail="OTP expired. Please request a new code.",
            )

        if pending["attempts"] >= OTP_MAX_ATTEMPTS:
            pending_registrations.pop(email, None)
            raise HTTPException(
                status_code=429,
                detail="Too many incorrect attempts. Request a new code.",
            )

        pending["attempts"] += 1
        submitted_hash = hashlib.sha256(payload.otp.encode()).hexdigest()

        if not hmac.compare_digest(submitted_hash, pending["otp_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect OTP.")

        registration_token = secrets.token_urlsafe(32)
        pending["verified"] = True
        pending["registration_token"] = hashlib.sha256(
            registration_token.encode()
        ).hexdigest()

    return {
        "verified": True,
        "registration_token": registration_token,
        "message": "Email verified. Complete your profile.",
    }


@router.post("/email/complete")
def complete_email_registration(
    payload: CompleteEmailRegistrationRequest,
    db: Session = Depends(get_db),
):
    email = normalize_email(payload.email)
    supplied_token_hash = hashlib.sha256(
        payload.registration_token.encode()
    ).hexdigest()

    now = datetime.now(timezone.utc)

    with otp_lock:
        pending = pending_registrations.get(email)

        if (
            pending is None
            or not pending["verified"]
            or now >= pending["expires_at"]
            or not hmac.compare_digest(
                pending["registration_token"] or "",
                supplied_token_hash,
            )
        ):
            raise HTTPException(
                status_code=401,
                detail="Email verification expired or invalid. Verify your email again.",
            )

    existing = db.execute(
        text("""
            SELECT user_id
            FROM users
            WHERE email = :email OR username = :email
            LIMIT 1
        """),
        {"email": email},
    ).scalar()

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="An account already exists for this email address.",
        )

    password_hash = pwd_hasher.hash(payload.password)

    try:
        # Store the email on the profile. This implementation does not
        # assume a person_id column exists in users.
        person_result = db.execute(
            text("""
                INSERT INTO persons
                    (full_name, date_of_birth, gender, email,
                     address, city, state, pincode)
                VALUES
                    (:full_name, :date_of_birth, :gender, :email,
                     :address, :city, :state, :pincode)
            """),
            {
                "full_name": payload.full_name.strip(),
                "date_of_birth": payload.date_of_birth,
                "gender": payload.gender,
                "email": email,
                "address": payload.address.strip() if payload.address else None,
                "city": payload.city.strip() if payload.city else None,
                "state": payload.state.strip() if payload.state else None,
                "pincode": payload.pincode.strip() if payload.pincode else None,
            },
        )
        person_id = person_result.lastrowid

        user_result = db.execute(
            text("""
                INSERT INTO users
                    (username, password, role, officer_id, status, email)
                VALUES
                    (:username, :password, 'Civilian', NULL, 'Active', :email)
            """),
            {
                "username": email,
                "password": password_hash,
                "email": email,
            },
        )
        user_id = user_result.lastrowid

        db.commit()

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account or profile conflicts with existing database records.",
        ) from exc
    except Exception:
        db.rollback()
        raise

    with otp_lock:
        pending_registrations.pop(email, None)

    user = {
        "user_id": user_id,
        "username": email,
        "role": "Civilian",
        "officer_id": None,
    }
    token = create_access_token(user)

    return {
        "message": "Civilian account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user_id,
            "username": email,
            "role": normalize_role("Civilian"),
            "officer_id": None,
            "person_id": person_id,
            "email_verified": True,
        },
    }
