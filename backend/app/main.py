from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError

from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.queries import router as queries_router
from app.api.routes.uploads import router as uploads_router
from app.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.db.database import engine
from app.db.models import Base
from app.services.auth import AuthMiddleware
from app.services.vector_store import ensure_pinecone_index_exists
from fastapi.middleware.cors import CORSMiddleware



Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:5173",
    "https://ask-vault-one.vercel.app"
]

app = FastAPI()
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(AuthMiddleware)
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(queries_router)
app.include_router(uploads_router)


@app.on_event("startup")
def on_startup():
    ensure_pinecone_index_exists()


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI with uv!"}
