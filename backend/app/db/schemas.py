from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=255)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime


class ConversationMessageBase(BaseModel):
    role: Literal["user", "llm"]
    content: str = Field(min_length=1)


class ConversationMessageCreate(ConversationMessageBase):
    project_id: int


class ConversationMessageRead(ConversationMessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime


class UploadDataResponse(BaseModel):
    message: str
    chunk_count: int
    embedding_count: int
    sparse_embedding_count: int
    stored_count: int


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)


class RetrievedChunk(BaseModel):
    chunk_number: int | None = None
    text: str
    score: float | None = None


class QueryResponse(BaseModel):
    answer: str
    retrieved_chunks: list[RetrievedChunk]
