from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


@dataclass(frozen=True)
class FriendlyError:
    code: str
    user_message: str


GENERIC_SERVER_ERROR = FriendlyError(
    code="internal_error",
    user_message="Something went wrong on our side. Please try again in a moment.",
)


def _stringify_detail(detail: Any) -> str:
    if isinstance(detail, str):
        return detail
    if detail is None:
        return ""
    return str(detail)


def build_friendly_error(*, status_code: int, detail: Any = None) -> FriendlyError:
    normalized_detail = _stringify_detail(detail)
    normalized_detail_lower = normalized_detail.lower()

    detail_mappings = {
        "Email is already registered": FriendlyError(
            code="email_already_registered",
            user_message="An account with this email already exists. Try logging in instead.",
        ),
        "Invalid email or password": FriendlyError(
            code="invalid_credentials",
            user_message="We couldn't log you in with those details. Please check your email and password and try again.",
        ),
        "Authentication required": FriendlyError(
            code="authentication_required",
            user_message="Your session has expired. Please log in again.",
        ),
        "User no longer exists": FriendlyError(
            code="user_missing",
            user_message="We couldn't verify your account anymore. Please log in again.",
        ),
        "Project not found": FriendlyError(
            code="project_not_found",
            user_message="We couldn't find that project.",
        ),
        "Unable to load project messages": FriendlyError(
            code="messages_unavailable",
            user_message="We couldn't load this conversation right now. Please try again.",
        ),
        "Upload at least one supported document before sending messages.": FriendlyError(
            code="project_has_no_uploads",
            user_message="Upload at least one document before starting the chat.",
        ),
        "Unable to extract text from the provided input": FriendlyError(
            code="content_extraction_failed",
            user_message="We couldn't read content from that upload. Please try a different file or link.",
        ),
        "Unable to chunk extracted text": FriendlyError(
            code="upload_processing_failed",
            user_message="We couldn't finish preparing that upload. Please try again.",
        ),
        "Unable to generate embeddings from extracted chunks": FriendlyError(
            code="upload_processing_failed",
            user_message="We couldn't finish preparing that upload. Please try again.",
        ),
        "Unable to generate sparse embeddings from extracted chunks": FriendlyError(
            code="upload_processing_failed",
            user_message="We couldn't finish preparing that upload. Please try again.",
        ),
        "Unable to store chunk embeddings": FriendlyError(
            code="upload_processing_failed",
            user_message="We couldn't save that upload for chat yet. Please try again.",
        ),
        "Unable to generate query embedding": FriendlyError(
            code="query_processing_failed",
            user_message="We couldn't process that question right now. Please try again.",
        ),
        "Unable to generate sparse query embedding": FriendlyError(
            code="query_processing_failed",
            user_message="We couldn't process that question right now. Please try again.",
        ),
        "No relevant project data found for this query": FriendlyError(
            code="no_relevant_content",
            user_message="I couldn't find a useful answer in this project's uploaded data. Try asking in a different way or add more content.",
        ),
        "No retrievable text found for this project": FriendlyError(
            code="no_relevant_content",
            user_message="I couldn't find readable content for that question yet. Try another question or upload more content.",
        ),
        "Unable to generate answer": FriendlyError(
            code="answer_generation_failed",
            user_message="We couldn't generate a response right now. Please try again.",
        ),
    }

    if normalized_detail.startswith("Unsupported file type."):
        return FriendlyError(
            code="unsupported_file_type",
            user_message="That file type isn't supported yet. Please choose one of the supported file types shown.",
        )

    if (
        "rate limit" in normalized_detail_lower
        or "too many requests" in normalized_detail_lower
        or "quota" in normalized_detail_lower
        or "resource has been exhausted" in normalized_detail_lower
    ):
        return FriendlyError(
            code="llm_rate_limited",
            user_message="The assistant is busy right now. Please wait a moment and try again.",
        )

    if normalized_detail in detail_mappings:
        return detail_mappings[normalized_detail]

    if status_code == status.HTTP_401_UNAUTHORIZED:
        return FriendlyError(
            code="unauthorized",
            user_message="Your session has expired. Please log in again.",
        )

    if status_code == status.HTTP_403_FORBIDDEN:
        return FriendlyError(
            code="forbidden",
            user_message="You don't have access to do that.",
        )

    if status_code == status.HTTP_404_NOT_FOUND:
        return FriendlyError(
            code="not_found",
            user_message="We couldn't find what you were looking for.",
        )

    if status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
        return FriendlyError(
            code="invalid_request",
            user_message="Please check the information you entered and try again.",
        )

    if 400 <= status_code < 500:
        return FriendlyError(
            code="request_failed",
            user_message="We couldn't complete that request. Please review your input and try again.",
        )

    return GENERIC_SERVER_ERROR


def build_error_response(*, status_code: int, detail: Any = None) -> JSONResponse:
    friendly_error = build_friendly_error(status_code=status_code, detail=detail)
    return JSONResponse(
        status_code=status_code,
        content={
            "error_code": friendly_error.code,
            "user_message": friendly_error.user_message,
            "detail": _stringify_detail(detail) or friendly_error.user_message,
        },
    )


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return build_error_response(status_code=exc.status_code, detail=exc.detail)


async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    return build_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=exc.errors(),
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=str(exc),
    )
