from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CaseWrite(BaseModel):
    """Fields accepted when a case is created or changed."""

    fir_id: int = Field(gt=0)
    case_title: str = Field(min_length=1, max_length=150)
    investigating_officer_id: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[date] = None
    status: Optional[str] = Field(default="FIR Registered", max_length=50)
    outcome: Optional[str] = Field(default=None, max_length=50)
    closing_date: Optional[date] = None
    remarks: Optional[str] = None

    @field_validator("case_title", "status", "outcome", mode="before")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.closing_date and self.closing_date < self.start_date:
            raise ValueError("closing_date cannot be earlier than start_date")
        return self


class CaseCreate(CaseWrite):
    pass


class CaseUpdate(BaseModel):
    """Partial update payload. At least one field must be supplied."""

    fir_id: Optional[int] = Field(default=None, gt=0)
    case_title: Optional[str] = Field(default=None, min_length=1, max_length=150)
    investigating_officer_id: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[date] = None
    status: Optional[str] = Field(default=None, max_length=50)
    outcome: Optional[str] = Field(default=None, max_length=50)
    closing_date: Optional[date] = None
    remarks: Optional[str] = None

    @field_validator("case_title", "status", "outcome", mode="before")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return CaseWrite.strip_text(value)

    @model_validator(mode="after")
    def require_update_data(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        return self


class CaseResponse(BaseModel):
    case_id: int
    fir_id: int
    case_title: str
    investigating_officer_id: Optional[int] = None
    start_date: Optional[date] = None
    status: Optional[str] = None
    outcome: Optional[str] = None
    closing_date: Optional[date] = None
    remarks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
