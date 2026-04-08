from pinecone import Pinecone, ServerlessSpec

from app.core.config import (
    GOOGLE_EMBEDDING_DIMENSION,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    PINECONE_TOP_K,
)


pinecone_client = Pinecone(api_key=PINECONE_API_KEY) if PINECONE_API_KEY else None
pinecone_index = None


def get_pinecone_index():
    global pinecone_index

    if pinecone_client is None:
        return None

    if pinecone_index is None:
        pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME)

    return pinecone_index


def ensure_pinecone_index_exists() -> None:
    global pinecone_index

    if pinecone_client is None:
        return

    if pinecone_client.has_index(PINECONE_INDEX_NAME):
        pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME)
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
    pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME)


def store_project_chunks(
    *,
    project_id: int,
    chunks: list[str],
    dense_embeddings: list[list[float]],
    sparse_embeddings: list[dict[str, list[float] | list[int]]],
) -> int:
    index = get_pinecone_index()
    if index is None:
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

    index.upsert(vectors=records, namespace=namespace)
    return len(records)


def query_project_chunks(
    *,
    project_id: int,
    dense_vector: list[float],
    sparse_vector: dict[str, list[float] | list[int]],
    top_k: int | None = None,
) -> list[dict]:
    index = get_pinecone_index()
    if index is None or not dense_vector:
        return []

    response = index.query(
        namespace=build_project_namespace(project_id),
        vector=dense_vector,
        sparse_vector={
            "indices": sparse_vector.get("indices", []),
            "values": sparse_vector.get("values", []),
        },
        top_k=top_k or PINECONE_TOP_K,
        include_metadata=True,
    )

    matches = getattr(response, "matches", None)
    if matches is None and isinstance(response, dict):
        matches = response.get("matches", [])

    normalized_matches = []
    for match in matches or []:
        metadata = getattr(match, "metadata", None)
        score = getattr(match, "score", None)
        if isinstance(match, dict):
            metadata = match.get("metadata", {})
            score = match.get("score")

        normalized_matches.append(
            {
                "score": score,
                "metadata": metadata or {},
            }
        )

    return normalized_matches

def build_project_namespace(project_id: int) -> str:
    return f"project-{project_id}"


def build_chunk_id(project_id: int, chunk_number: int) -> str:
    return f"project-{project_id}-chunk-{chunk_number}"
