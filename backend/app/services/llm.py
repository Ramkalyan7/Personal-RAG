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
        """You are a helpful AI assistant that answers user questions using ONLY the provided context.

### Instructions:
- Carefully read the user question and the provided context.
- Use ONLY the information from the context to answer the question.
- If the answer is not explicitly present in the context, say:
  "I don't have enough information to answer this question based on the provided context."
- Do NOT use prior knowledge or make assumptions.
- Do NOT hallucinate or fabricate details.
- If multiple sources are provided, combine them logically and cite relevant parts.
- Answer the question in your own words, but only based on the context. Do NOT copy verbatim unless quoting.

### Answer Guidelines:
- Be clear, concise, and accurate.
- Prefer structured answers (bullet points or short paragraphs) when helpful.
- If relevant, quote or reference the context.
- Maintain a neutral and factual tone."""
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
    
    print("Streaming RAG answer...",stream)  # Debugging statement --- IGNORE ---

    for chunk in stream:
        text = getattr(chunk, "text", None)
        print("Received chunk:", text)  # Debugging statement --- IGNORE ---
        if text:
            yield str(text)
