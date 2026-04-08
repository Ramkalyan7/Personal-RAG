import json
import sys

from app.services.embeddings import create_sparse_embeddings, pinecone_client


SAMPLE_TEXTS = [
    "Personal RAG lets users upload documents and ask grounded questions over their own data.",
    "Sparse embeddings are useful for lexical retrieval and can complement dense semantic vectors.",
    "This sample checks the real Pinecone sparse embedding path without using any testing library.",
]


def main() -> int:
    if pinecone_client is None:
        print("Pinecone client is not configured. Set PINECONE_API_KEY in backend/.env and try again.")
        return 1

    print("Generating sparse embeddings for sample texts...")
    print(json.dumps(SAMPLE_TEXTS, indent=2))

    try:
        sparse_embeddings = create_sparse_embeddings(SAMPLE_TEXTS)
    except Exception as exc:
        print(f"Sparse embedding request failed: {exc}")
        return 1

    print("\nSparse embedding output:")
    print(json.dumps(sparse_embeddings, indent=2))
    print(f"\nGenerated {len(sparse_embeddings)} sparse embeddings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
