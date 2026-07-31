from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import users, datasets
import os

# Create Database Tables
Base.metadata.create_all(bind=engine)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="xVector API")

# Mount CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Sub-Routers
app.include_router(users.router)
app.include_router(datasets.router)