import math

from google import genai
from google.genai import types
from pinecone import Pinecone

from app.core.config import (
    GOOGLE_API_KEY,
    GOOGLE_EMBEDDING_DIMENSION,
    GOOGLE_EMBEDDING_MODEL,
    PINECONE_API_KEY,
    PINECONE_SPARSE_MODEL,
)


google_client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None
pinecone_client = Pinecone(api_key=PINECONE_API_KEY) if PINECONE_API_KEY else None


def create_embeddings(text_chunks: list[str]) -> list[list[float]]:
    if not text_chunks or google_client is None:
        return []

    response = google_client.models.embed_content(
        model=GOOGLE_EMBEDDING_MODEL,
        contents=text_chunks,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=GOOGLE_EMBEDDING_DIMENSION,
        ),
    )

    return [normalize_embedding(embedding.values) for embedding in response.embeddings]


def create_sparse_embeddings(text_chunks: list[str]) -> list[dict[str, list[float] | list[int]]]:
    if not text_chunks or pinecone_client is None:
        return []

    response = pinecone_client.inference.embed(
        model=PINECONE_SPARSE_MODEL,
        inputs=text_chunks,
        parameters={"input_type": "passage", "truncate": "END"},
    )

    return [
        {
            "indices": vector.get("sparse_values", {}).get("indices", []),
            "values": vector.get("sparse_values", {}).get("values", []),
        }
        for vector in response.data
    ]


def normalize_embedding(values: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(value * value for value in values))
    if magnitude == 0:
        return values
    return [value / magnitude for value in values]
