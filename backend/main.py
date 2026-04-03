from fastapi import FastAPI
from models import Base
from database import engine
from pinecone import Pinecone, ServerlessSpec


Base.metadata.create_all(bind=engine)



app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI with uv!"}