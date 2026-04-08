from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Project, ProjectUpload, User
from app.db.schemas import ProjectDataStatus, UploadDataResponse
from app.services.auth import get_current_user, require_authenticated_user
from app.services.chunking import chunk_text
from app.services.embeddings import create_embeddings, create_sparse_embeddings
from app.services.content_extraction import (
    SUPPORTED_FILE_SUFFIXES,
    extract_text_from_upload,
    is_supported_file_upload,
)
from app.services.vector_store import store_project_chunks


router = APIRouter(
    prefix="/projects",
    tags=["uploads"],
    dependencies=[Depends(require_authenticated_user)],
)


def _get_owned_project(*, project_id: int, db: Session, current_user: User) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


def _build_upload_record(
    *,
    project_id: int,
    file: UploadFile | None,
    raw_text: str | None,
    youtube_url: str | None,
    website_url: str | None,
) -> ProjectUpload:
    if file is not None:
        suffix = (file.filename or "").rsplit(".", 1)
        file_type = f".{suffix[-1].lower()}" if len(suffix) > 1 else None
        return ProjectUpload(
            project_id=project_id,
            source_type="file",
            file_name=file.filename,
            file_type=file_type,
            content_type=file.content_type,
        )

    if youtube_url and youtube_url.strip():
        return ProjectUpload(
            project_id=project_id,
            source_type="youtube",
            file_name=youtube_url.strip(),
            file_type="url",
            content_type=None,
        )

    if website_url and website_url.strip():
        return ProjectUpload(
            project_id=project_id,
            source_type="website",
            file_name=website_url.strip(),
            file_type="url",
            content_type=None,
        )

    return ProjectUpload(
        project_id=project_id,
        source_type="text",
        file_name="Pasted text",
        file_type="text",
        content_type="text/plain",
    )


@router.get("/{project_id}/data-status", response_model=ProjectDataStatus)
def get_project_data_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_owned_project(project_id=project_id, db=db, current_user=current_user)

    return ProjectDataStatus(
        project_id=project.id,
        has_uploaded_data=bool(project.uploads),
        supported_file_types=list(SUPPORTED_FILE_SUFFIXES),
        uploads=project.uploads,
    )


@router.post("/{project_id}/upload-data", response_model=UploadDataResponse)
async def upload_data(
    project_id: int,
    raw_text: str | None = Form(default=None),
    youtube_url: str | None = Form(default=None),
    website_url: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_owned_project(project_id=project_id, db=db, current_user=current_user)

    if file is not None and not is_supported_file_upload(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported file type. Supported file types: "
                + ", ".join(SUPPORTED_FILE_SUFFIXES)
            ),
        )

    file_bytes = await file.read() if file is not None else None
    extracted_text = extract_text_from_upload(
        raw_text=raw_text,
        file_name=file.filename if file is not None else None,
        file_bytes=file_bytes,
        youtube_url=youtube_url,
        website_url=website_url,
    )


    if not extracted_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to extract text from the provided input",
        )

    chunks = chunk_text(extracted_text)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to chunk extracted text",
        )
        

    embeddings = create_embeddings(chunks)
    if not embeddings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to generate embeddings from extracted chunks",
        )
    

    sparse_embeddings = create_sparse_embeddings(chunks)
    if not sparse_embeddings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to generate sparse embeddings from extracted chunks",
        )
        

    stored_count = store_project_chunks(
        project_id=project.id,
        chunks=chunks,
        dense_embeddings=embeddings,
        sparse_embeddings=sparse_embeddings,
    )
    
    if stored_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to store chunk embeddings",
        )

    db.add(
        _build_upload_record(
            project_id=project.id,
            file=file,
            raw_text=raw_text,
            youtube_url=youtube_url,
            website_url=website_url,
        )
    )
    
    db.commit()

    return UploadDataResponse(
        message="Data uploaded, text extracted, chunked, embedded, and stored successfully",
        chunk_count=len(chunks),
        embedding_count=len(embeddings),
        sparse_embedding_count=len(sparse_embeddings),
        stored_count=stored_count,
    )
