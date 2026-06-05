"""Request schemas for the safety API."""

from typing import Optional
from pydantic import BaseModel, Field


class ChildAssessment(BaseModel):
    age_months: int = Field(..., ge=0, le=60, description="Child age in months (IMCI: 2–59).")
    respiratory_rate: Optional[int] = Field(
        None, ge=0, le=200, description="Measured breaths per minute."
    )
    chest_indrawing: bool = Field(False, description="Lower chest-wall indrawing present.")
    stridor: bool = Field(False, description="Stridor in a calm child.")
    general_danger_signs: list[str] = Field(
        default_factory=list,
        description="Any of: not_able_to_drink_or_breastfeed, vomits_everything, "
        "convulsions, lethargic_or_unconscious.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "age_months": 36,
                "respiratory_rate": 52,
                "chest_indrawing": True,
                "stridor": False,
                "general_danger_signs": [],
            }
        }
    }


class MedicationCheck(BaseModel):
    proposed: list[str] = Field(..., description="Drugs the doctor intends to prescribe.")
    allergies: list[str] = Field(default_factory=list, description="Patient allergies (drug or class).")
    current_meds: list[str] = Field(default_factory=list, description="Drugs the patient already takes.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "proposed": ["Amoxicillin"],
                "allergies": ["Penicillin"],
                "current_meds": ["Salbutamol"],
            }
        }
    }
