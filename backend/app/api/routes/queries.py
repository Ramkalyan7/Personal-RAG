import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ConversationMessage, Project, User
from app.db.schemas import QueryRequest, QueryResponse, RetrievedChunk
from app.services.auth import get_current_user, require_authenticated_user
from app.services.embeddings import create_query_embedding, create_sparse_query_embedding
from app.services.llm import generate_rag_answer, stream_rag_answer
from app.services.vector_store import query_project_chunks


router = APIRouter(
    prefix="/projects",
    tags=["queries"],
    dependencies=[Depends(require_authenticated_user)],
)


def _sse_message(event: str, data_obj) -> str:
    return f"event: {event}\ndata: {json.dumps(data_obj, ensure_ascii=False)}\n\n"


def _stream_query_events(
    db: Session,
    project_id: int,
    question: str,
    contexts: list[str],
    stream_id: str,
):
    db.add(
        ConversationMessage(
            project_id=project_id,
            role="user",
            content=question,
        )
    )
    db.commit()

    yield _sse_message("message_start", {"id": stream_id})

    chunks: list[str] = []
    try:
        for delta in stream_rag_answer(question=question, contexts=contexts):
            if not delta:
                continue
            chunks.append(delta)
            yield _sse_message("message_delta", {"id": stream_id, "delta": delta})

        final_text = "".join(chunks).strip()
        if not final_text:
            raise RuntimeError("Unable to generate answer")

        db.add(
            ConversationMessage(
                project_id=project_id,
                role="llm",
                content=final_text,
            )
        )
        db.commit()

        yield _sse_message("message_done", {"id": stream_id})
    except Exception as e:
        yield _sse_message("error", {"id": stream_id, "message": str(e) or "Unknown error"})


@router.post("/{project_id}/query", response_model=QueryResponse)
def query_project(
    project_id: int,
    payload: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    dense_query_embedding = create_query_embedding(payload.question)
    if not dense_query_embedding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to generate query embedding",
        )

    sparse_query_embedding = create_sparse_query_embedding(payload.question)
    retrieval_results = query_project_chunks(
        project_id=project.id,
        dense_vector=dense_query_embedding,
        sparse_vector=sparse_query_embedding,
    )
    if not retrieval_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No relevant project data found for this query",
        )

    contexts = [
        str(result["metadata"].get("text", "")).strip()
        for result in retrieval_results
        if str(result["metadata"].get("text", "")).strip()
    ]
    if not contexts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No retrievable text found for this project",
        )

    answer = generate_rag_answer(question=payload.question, contexts=contexts)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to generate answer",
        )

    db.add(
        ConversationMessage(
            project_id=project.id,
            role="user",
            content=payload.question,
        )
    )
    db.add(
        ConversationMessage(
            project_id=project.id,
            role="llm",
            content=answer,
        )
    )
    db.commit()

    return QueryResponse(
        answer=answer,
        retrieved_chunks=[
            RetrievedChunk(
                chunk_number=result["metadata"].get("chunk_number"),
                text=str(result["metadata"].get("text", "")),
                score=result.get("score"),
            )
            for result in retrieval_results
        ],
    )


@router.post("/{project_id}/query/stream")
def stream_query_project(
    project_id: int,
    payload: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    dense_query_embedding = create_query_embedding(payload.question)
    if not dense_query_embedding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to generate query embedding",
        )

    sparse_query_embedding = create_sparse_query_embedding(payload.question)
    retrieval_results = query_project_chunks(
        project_id=project.id,
        dense_vector=dense_query_embedding,
        sparse_vector=sparse_query_embedding,
    )
    if not retrieval_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No relevant project data found for this query",
        )

    contexts = [
        str(result["metadata"].get("text", "")).strip()
        for result in retrieval_results
        if str(result["metadata"].get("text", "")).strip()
    ]
    if not contexts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No retrievable text found for this project",
        )

    stream_id = str(uuid4())

    return StreamingResponse(
        _stream_query_events(
            db=db,
            project_id=project.id,
            question=payload.question,
            contexts=contexts,
            stream_id=stream_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
