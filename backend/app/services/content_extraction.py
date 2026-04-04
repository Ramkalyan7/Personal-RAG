from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests
from bs4 import BeautifulSoup
from groq import Groq
from pypdf import PdfReader
from youtube_transcript_api import YouTubeTranscriptApi

from app.core.config import GROQ_API_KEY, GROQ_TRANSCRIPTION_MODEL


groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def extract_text_from_upload(
    *,
    raw_text: str | None,
    file_name: str | None,
    file_bytes: bytes | None,
    youtube_url: str | None,
    website_url: str | None,
) -> str:
    if raw_text and raw_text.strip():
        return raw_text.strip()

    if file_name and file_bytes is not None:
        return extract_text_from_file(file_name=file_name, file_bytes=file_bytes)

    if youtube_url and youtube_url.strip():
        return extract_text_from_youtube(youtube_url.strip())

    if website_url and website_url.strip():
        return extract_text_from_website(website_url.strip())

    return ""


def extract_text_from_file(*, file_name: str, file_bytes: bytes) -> str:
    suffix = Path(file_name).suffix.lower()

    if suffix == ".pdf":
        return extract_text_from_pdf(file_bytes)

    if suffix in {".txt", ".md", ".csv", ".json"}:
        return file_bytes.decode("utf-8", errors="ignore").strip()

    if suffix in {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}:
        return extract_text_from_audio(file_name=file_name, file_bytes=file_bytes)

    return file_bytes.decode("utf-8", errors="ignore").strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(page.strip() for page in pages if page.strip()).strip()


def extract_text_from_youtube(url: str) -> str:
    video_id = get_youtube_video_id(url)
    if not video_id:
        return ""

    transcript = YouTubeTranscriptApi().fetch(video_id)
    return " ".join(chunk.text.strip() for chunk in transcript if chunk.text.strip()).strip()


def extract_text_from_website(url: str) -> str:
    response = requests.get(url, timeout=20)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    return " ".join(text.split()).strip()


def extract_text_from_audio(*, file_name: str, file_bytes: bytes) -> str:
    if groq_client is None:
        return ""

    transcription = groq_client.audio.transcriptions.create(
        file=(file_name, file_bytes),
        model=GROQ_TRANSCRIPTION_MODEL,
        response_format="json",
    )
    return (transcription.text or "").strip()


def get_youtube_video_id(url: str) -> str | None:
    parsed = urlparse(url)

    if parsed.hostname in {"youtu.be"}:
        return parsed.path.lstrip("/") or None

    if parsed.hostname in {"www.youtube.com", "youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        if parsed.path.startswith("/shorts/") or parsed.path.startswith("/embed/"):
            parts = [part for part in parsed.path.split("/") if part]
            return parts[-1] if parts else None

    return None
