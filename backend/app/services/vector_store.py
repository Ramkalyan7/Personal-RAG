from pinecone import Pinecone

from app.core.config import PINECONE_API_KEY, PINECONE_INDEX_NAME


pinecone_client = Pinecone(api_key=PINECONE_API_KEY) if PINECONE_API_KEY else None
pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME) if pinecone_client else None


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
