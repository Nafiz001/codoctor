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


class RagQuery(BaseModel):
    query: str = Field(..., description="A clinical question, in English or Bangla.")
    k: int = Field(4, ge=1, le=12, description="How many chunks to return.")


class Encounter(BaseModel):
    age_months: int = Field(36, ge=0, le=60)
    symptoms: list[str] = Field(default_factory=list)
    vitals: dict = Field(default_factory=dict, description='e.g. {"respiratory_rate": 52, "temp_c": 39.1}')
    chest_indrawing: bool = False
    stridor: bool = False
    general_danger_signs: list[str] = Field(default_factory=list)
    proposed_meds: list[str] = Field(default_factory=list)


class PatientContext(BaseModel):
    allergies: list[str] = Field(default_factory=list)
    current_meds: list[str] = Field(default_factory=list)


class ConsultRequest(BaseModel):
    """Full input to the agentic orchestrator."""

    patient: PatientContext = Field(default_factory=PatientContext)
    encounter: Encounter

    model_config = {
        "json_schema_extra": {
            "example": {
                "patient": {"allergies": ["Penicillin"], "current_meds": ["Salbutamol"]},
                "encounter": {
                    "age_months": 36,
                    "symptoms": ["fever", "cough"],
                    "vitals": {"respiratory_rate": 52, "temp_c": 39.1},
                    "chest_indrawing": True,
                    "proposed_meds": ["Amoxicillin"],
                },
            }
        }
    }


class DeviceSegment(BaseModel):
    t: float = Field(..., description="Seconds into the consultation.")
    speaker: str = Field(..., description='"doctor" or "patient".')
    text: str
    conf: float = Field(1.0, ge=0, le=1, description="ASR confidence 0–1.")


class FuseRequest(BaseModel):
    device_a: list[DeviceSegment]
    device_b: list[DeviceSegment]


class FromTranscriptRequest(BaseModel):
    """Two raw device transcripts → fuse → extract → analyze."""

    patient: PatientContext = Field(default_factory=PatientContext)
    device_a: list[DeviceSegment]
    device_b: list[DeviceSegment]
    age_months: Optional[int] = Field(None, description="Optional age override.")


# --- Live session (real two-device flow joined by QR) ----------------------


class SessionCreateRequest(BaseModel):
    """Doctor console opens a session; patient context seeds the safety checks."""

    patient: PatientContext = Field(default_factory=PatientContext)


class JoinRequest(BaseModel):
    role: str = Field("patient", description='"doctor" or "patient".')


class TranscriptAppend(BaseModel):
    """One recognized utterance streamed from a device's browser ASR."""

    role: str = Field(..., description='"doctor" or "patient" — which device.')
    text: str = Field(..., min_length=1)
    conf: float = Field(0.9, ge=0, le=1, description="ASR confidence 0–1.")


class SessionAnalyzeRequest(BaseModel):
    """Clinical context the doctor confirms before running the analysis."""

    patient: PatientContext = Field(default_factory=PatientContext)
    age_months: Optional[int] = Field(None, description="Child age in months.")
    proposed_meds: list[str] = Field(
        default_factory=list, description="Drug(s) the doctor intends to prescribe."
    )
    publish: bool = Field(
        True, description="If false, analyze for the doctor only — don't push to the patient yet."
    )


class PublishRequest(BaseModel):
    """The doctor sends the reviewed record (summary + prescription + the whole
    conversation) to the patient's phone."""

    summary: dict = Field(..., description="The patient-facing summary from analyze.")
    prescription: str = Field("", description="The doctor's confirmed prescription.")


class PatientContextUpdate(BaseModel):
    """The patient fills their own history on their phone."""

    allergies: Optional[list[str]] = None
    current_meds: Optional[list[str]] = None
    notes: Optional[str] = None


# --- AI feature endpoints --------------------------------------------------


class LivePromptRequest(BaseModel):
    """A partial transcript mid-consultation → the next guideline questions."""

    transcript: str = Field(..., description="The conversation so far (Bangla/English).")
    age_months: Optional[int] = Field(None, description="Child age in months, if known.")
    allergies: list[str] = Field(default_factory=list, description="Known allergies, if recorded.")
    current_meds: list[str] = Field(default_factory=list, description="Current meds, if recorded.")


class DoseRequest(BaseModel):
    drug: str = Field(..., description="Generic drug name, e.g. 'Amoxicillin'.")
    weight_kg: Optional[float] = Field(None, ge=0, le=150, description="Child weight in kg.")
    age_months: Optional[int] = Field(None, ge=0, le=216)


class ReconcileRequest(BaseModel):
    proposed: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    current_meds: list[str] = Field(default_factory=list)
    past_meds: list[str] = Field(default_factory=list, description="Meds from previous reports.")


class RREstimateRequest(BaseModel):
    """A per-frame breathing signal from the phone camera."""

    samples: list[float] = Field(..., description="Per-frame chest brightness/motion values.")
    fps: float = Field(..., gt=0, le=120, description="Frames per second of the samples.")


class SeedSegment(BaseModel):
    role: str = Field(..., description='"doctor" or "patient".')
    text: str


class SeedCaseRequest(BaseModel):
    """Load a reproducible demo case into a live session: seeds the transcript
    with the dialogue and runs the analysis on the STRUCTURED encounter (so the
    result is deterministic, not dependent on live ASR)."""

    patient: PatientContext = Field(default_factory=PatientContext)
    encounter: Encounter
    transcript: list[SeedSegment] = Field(default_factory=list)
