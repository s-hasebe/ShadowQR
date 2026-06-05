from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class QRErrorLevel(str, Enum):
    L = "L"
    M = "M"
    Q = "Q"
    H = "H"


class ConvertParams(BaseModel):
    light: list[float] = Field(default=[0.0, 50.0, 150.0], min_length=3, max_length=3)
    wall_normal: list[float] = Field(default=[0.0, 0.0, -1.0], min_length=3, max_length=3)
    wall_offset: float = Field(default=500.0, gt=0)
    qr_size: float = Field(default=100.0, gt=0)
    qr_error_level: QRErrorLevel = QRErrorLevel.H
    voxel_pitch: float = Field(default=0.5, gt=0, le=5.0)
    rotation_matrix: list[list[float]] = Field(
        default=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],
        min_length=4,
        max_length=4,
    )

    @field_validator("rotation_matrix")
    @classmethod
    def validate_4x4(cls, v: list[list[float]]) -> list[list[float]]:
        if any(len(row) != 4 for row in v):
            raise ValueError("rotation_matrix must be 4x4")
        return v


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ProgressMessage(BaseModel):
    step: str
    progress: float = Field(ge=0.0, le=1.0)
    message: str


class ConvertResponse(BaseModel):
    job_id: str


class ResultResponse(BaseModel):
    job_id: str
    status: JobStatus
    qr_verified: Optional[bool] = None
    qr_decoded_text: Optional[str] = None
    error: Optional[str] = None
    warning: Optional[str] = None
