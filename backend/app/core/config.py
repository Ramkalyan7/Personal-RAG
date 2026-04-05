import os

from dotenv import load_dotenv


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_TRANSCRIPTION_MODEL = os.getenv("GROQ_TRANSCRIPTION_MODEL", "whisper-large-v3-turbo")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_EMBEDDING_MODEL = os.getenv("GOOGLE_EMBEDDING_MODEL", "gemini-embedding-001")
GOOGLE_EMBEDDING_DIMENSION = int(os.getenv("GOOGLE_EMBEDDING_DIMENSION", "1536"))
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_SPARSE_MODEL = os.getenv("PINECONE_SPARSE_MODEL", "pinecone-sparse-english-v0")
