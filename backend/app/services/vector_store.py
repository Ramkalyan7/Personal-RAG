from pinecone import Pinecone, ServerlessSpec

from app.core.config import (
    GOOGLE_EMBEDDING_DIMENSION,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
)


pinecone_client = Pinecone(api_key=PINECONE_API_KEY) if PINECONE_API_KEY else None
pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME) if pinecone_client else None


def ensure_pinecone_index_exists() -> None:
    if pinecone_client is None:
        return

    if pinecone_client.has_index(PINECONE_INDEX_NAME):
        return

    pinecone_client.create_index(
        name=PINECONE_INDEX_NAME,
        vector_type="dense",
        dimension=GOOGLE_EMBEDDING_DIMENSION,
        metric="dotproduct",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1",
        ),
    )


def store_project_chunks(
    *,
    project_id: int,
    chunks: list[str],
    dense_embeddings: list[list[float]],
    sparse_embeddings: list[dict[str, list[float] | list[int]]],
) -> int:
    if pinecone_index is None:
        return 0

    records = []
    namespace = build_project_namespace(project_id)

    for chunk_number, (chunk_text, dense_vector, sparse_vector) in enumerate(
        zip(chunks, dense_embeddings, sparse_embeddings, strict=False),
        start=1,
    ):
        records.append(
            {
                "id": build_chunk_id(project_id, chunk_number),
                "values": dense_vector,
                "sparse_values": {
                    "indices": sparse_vector["indices"],
                    "values": sparse_vector["values"],
                },
                "metadata": {
                    "project_id": project_id,
                    "chunk_number": chunk_number,
                    "text": chunk_text,
                },
            }
        )

    if not records:
        return 0

    pinecone_index.upsert(vectors=records, namespace=namespace)
    return len(records)


def build_project_namespace(project_id: int) -> str:
    return f"project-{project_id}"


def build_chunk_id(project_id: int, chunk_number: int) -> str:
    return f"project-{project_id}-chunk-{chunk_number}"
