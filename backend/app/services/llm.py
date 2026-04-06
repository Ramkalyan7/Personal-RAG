from google import genai
from google.genai import types

from app.core.config import GOOGLE_API_KEY, GOOGLE_GENERATION_MODEL


google_client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None


def build_rag_prompt(*, question: str, contexts: list[str]) -> str:
    context_block = "\n\n".join(
        f"Context {index}:\n{context}"
        for index, context in enumerate(contexts, start=1)
    )

    return (
        "Answer the user's question using only the provided context. "
        "If the answer is not in the context, say that the uploaded project data does not contain enough information.\n\n"
        f"Question:\n{question}\n\n"
        f"Context:\n{context_block}"
    )


def generate_rag_answer(*, question: str, contexts: list[str]) -> str:
    if google_client is None:
        return ""

    prompt = build_rag_prompt(question=question, contexts=contexts)

    response = google_client.models.generate_content(
        model=GOOGLE_GENERATION_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )
    return (response.text or "").strip()


def stream_rag_answer(*, question: str, contexts: list[str]):
    if google_client is None:
        return

    prompt = build_rag_prompt(question=question, contexts=contexts)

    stream = google_client.models.generate_content_stream(
        model=GOOGLE_GENERATION_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )

    for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield str(text)
