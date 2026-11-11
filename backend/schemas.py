from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    # refresh_token: str
    token_type: str

class DatasetResponse(BaseModel):
    id: int
    name: str
    filepath: str
    created_at: datetime

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy models

class ComputeRequest(BaseModel):
    column: str
    operation: str

class PaginatedDatasetResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[DatasetResponse]