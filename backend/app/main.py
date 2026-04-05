from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.queries import router as queries_router
from app.api.routes.uploads import router as uploads_router
from app.db.database import engine
from app.db.models import Base
from app.services.auth import AuthMiddleware
from app.services.vector_store import ensure_pinecone_index_exists


Base.metadata.create_all(bind=engine)

app = FastAPI()
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
