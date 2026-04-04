from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.db.database import engine
from app.db.models import Base
from app.services.auth import AuthMiddleware


Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(AuthMiddleware)
app.include_router(auth_router)
app.include_router(projects_router)


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI with uv!"}
