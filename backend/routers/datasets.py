import os
import uuid
import numpy as np
import pandas as pd
from typing import Dict, List, Literal, Tuple
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/dataset", tags=["Datasets"])

# High-Concurrency O(1) Cache
COMPUTE_CACHE: Dict[Tuple[int, str, str], float] = {}
PLOT_CACHE: Dict[Tuple[int, str, str, str], dict] = {}  # (dataset_id, col1, col2, agg) -> plot payload

MAX_PLOT_GROUPS = 50   # bars/categories returned when aggregating
MAX_PLOT_POINTS = 500  # raw points returned when not aggregating

@router.post("", status_code=201)
async def upload_dataset(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Dataset name cannot be empty")

    # Dataset names are what the user sees, so they must be unique per user (case-insensitive)
    duplicate = db.query(models.Dataset).filter(
        models.Dataset.user_id == current_user.id,
        func.lower(models.Dataset.name) == name.lower()
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail=f"You already have a dataset named '{name}'")

    file_content = await file.read()
    # Never build the disk path from the client-supplied filename (path traversal); the display name lives in the DB
    filepath = os.path.join("uploads", f"{uuid.uuid4().hex}.csv")

    # Write the file before responding so the dataset is usable as soon as the client is notified
    try:
        with open(filepath, "wb") as f:
            f.write(file_content)
    except OSError:
        raise HTTPException(status_code=500, detail="Failed to save file")

    new_dataset = models.Dataset(name=name, filepath=filepath, user_id=current_user.id)
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)

    return {"id": new_dataset.id, "name": new_dataset.name, "detail": "Upload completed successfully."}

@router.get("", response_model=schemas.PaginatedDatasetResponse)
def get_datasets(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=100),  # Default 5 so you can easily verify pagination works in the UI
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    skip = (page - 1) * limit
    
    # 1. Get the total count of datasets for this user
    total = db.query(models.Dataset).filter(models.Dataset.user_id == current_user.id).count()
    
    # 2. Get the specific slice of datasets for the current page (ordered so pages are stable, newest first)
    datasets = db.query(models.Dataset).filter(models.Dataset.user_id == current_user.id).order_by(models.Dataset.id.desc()).offset(skip).limit(limit).all()
    
    # 3. Return the structured dictionary that matches your schema
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": datasets
    }

@router.get("/{dataset_id}/preview")
def preview_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id, models.Dataset.user_id == current_user.id).first()
    if not dataset or not os.path.exists(dataset.filepath):
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    df = pd.read_csv(dataset.filepath, nrows=25).fillna("")
    return {"columns": df.columns.tolist(), "rows": df.to_dict(orient="records")}

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id, models.Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if os.path.exists(dataset.filepath):
        os.remove(dataset.filepath)
        
    db.delete(dataset)
    db.commit()
    
    # Prune deleted dataset from caches
    for cache in (COMPUTE_CACHE, PLOT_CACHE):
        for k in [k for k in cache if k[0] == dataset_id]:
            del cache[k]
        
    return {"detail": "Dataset deleted successfully"}

@router.post("/{dataset_id}/compute")
def compute_statistic(dataset_id: int, req: schemas.ComputeRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id, models.Dataset.user_id == current_user.id).first()
    if not dataset or not os.path.exists(dataset.filepath):
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    cache_key = (dataset_id, req.column, req.operation)
    if cache_key in COMPUTE_CACHE:
        return {"column": req.column, "operation": req.operation, "result": COMPUTE_CACHE[cache_key], "cached": True}

    df = pd.read_csv(dataset.filepath)
    if req.column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.column}' not found")
    if not pd.api.types.is_numeric_dtype(df[req.column]):
        raise HTTPException(status_code=400, detail=f"Column '{req.column}' is not numeric")
        
    col_data = df[req.column].dropna()
    if col_data.empty:
        raise HTTPException(status_code=400, detail=f"Column '{req.column}' is empty")
        
    if req.operation == 'min':
        result = col_data.min()
    elif req.operation == 'max':
        result = col_data.max()
    elif req.operation == 'sum':
        result = col_data.sum()
    elif req.operation == 'mexwf':
        a = col_data.astype(int).tolist()
        a.sort()
        mexwf = 0
        i = 0
        while i < len(a):
            if a[i] == mexwf:
                mexwf += 1
            i += 1
        result = mexwf
    else:
        raise HTTPException(status_code=400, detail="Invalid operation")
        
    COMPUTE_CACHE[cache_key] = float(result)
    return {"column": req.column, "operation": req.operation, "result": float(result), "cached": False}

@router.get("/{dataset_id}/plot")
def plot_data(
    dataset_id: int,
    col1: str,
    col2: str,
    agg: Literal["sum", "mean", "count", "none"] = "sum",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id, models.Dataset.user_id == current_user.id).first()
    if not dataset or not os.path.exists(dataset.filepath):
        raise HTTPException(status_code=404, detail="Dataset not found")

    cache_key = (dataset_id, col1, col2, agg)
    if cache_key in PLOT_CACHE:
        return {**PLOT_CACHE[cache_key], "cached": True}

    columns = pd.read_csv(dataset.filepath, nrows=0).columns
    if col1 not in columns or col2 not in columns:
        raise HTTPException(status_code=400, detail="Columns not found")

    # Read only the two selected columns, but across the whole file
    raw = pd.read_csv(dataset.filepath, usecols=list({col1, col2}))
    df = pd.DataFrame({"x": raw[col1], "y": pd.to_numeric(raw[col2], errors="coerce")})

    if agg == "count":
        df = df.dropna(subset=["x"])
    else:
        df = df.dropna()
        if df.empty:
            raise HTTPException(status_code=400, detail=f"Column '{col2}' has no numeric values")

    if agg == "none":
        total = len(df)
        # Evenly spaced sample across the file rather than the first N rows
        if total > MAX_PLOT_POINTS:
            df = df.iloc[np.linspace(0, total - 1, MAX_PLOT_POINTS).astype(int)]
    else:
        grouped = df.groupby("x")["y"]
        series = grouped.size() if agg == "count" else grouped.agg(agg)
        total = len(series)
        if total > MAX_PLOT_GROUPS:
            series = series.nlargest(MAX_PLOT_GROUPS)
        # Numeric categories (e.g. years) read best in order; text categories largest-first
        series = series.sort_index() if pd.api.types.is_numeric_dtype(series.index) else series.sort_values(ascending=False)
        df = series.reset_index()
        df.columns = ["x", "y"]

    payload = {
        "col1": col1,
        "col2": col2,
        "agg": agg,
        "data": df.to_dict(orient="records"),
        "total": total,
        "truncated": total > len(df),
    }
    PLOT_CACHE[cache_key] = payload
    return {**payload, "cached": False}
