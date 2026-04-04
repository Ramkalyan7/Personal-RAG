from fastapi import FastAPI
from models import Base
from database import engine
from dotenv import load_dotenv

load_dotenv() 


Base.metadata.create_all(bind=engine)



app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI with uv!"}