from google import genai
from google.genai import types

from app.core.config import GOOGLE_API_KEY, GOOGLE_GENERATION_MODEL


google_client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None


def generate_rag_answer(*, question: str, contexts: list[str]) -> str:
    if google_client is None:
        return ""

    context_block = "\n\n".join(
        f"Context {index}:\n{context}"
        for index, context in enumerate(contexts, start=1)
    )

    prompt = (
        "Answer the user's question using only the provided context. "
        "If the answer is not in the context, say that the uploaded project data does not contain enough information.\n\n"
        f"Question:\n{question}\n\n"
        f"Context:\n{context_block}"
    )

    response = google_client.models.generate_content(
        model=GOOGLE_GENERATION_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )
    return (response.text or "").strip()
