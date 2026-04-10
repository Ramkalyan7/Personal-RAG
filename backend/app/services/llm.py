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
        """You are a helpful AI assistant that answers the user's question using ONLY the provided context.

Instructions:
- Carefully read the question and the provided context.
- Use only the information present in the context.
- Do not use prior knowledge, make assumptions, or add facts that are not supported by the context.
- If the answer is not explicitly supported by the context, reply exactly with:
I don't have enough information to answer this question based on the provided context.
- If multiple context sections are relevant, combine them into one coherent answer.
- Keep the answer concise, direct, and factually grounded.

Formatting rules:
- Write in clean plain text.
- Do not use markdown.
- Do not use asterisks, bold text, headings, or code formatting.
- Do not start lines with bullet symbols like *, -, or •.
- Prefer short paragraphs.
- If a list is necessary, use simple numbered lines like 1. 2. 3.
- Do not add conversational filler before the answer."""
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
