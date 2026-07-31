import os
import uuid
import pandas as pd
from typing import Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth
from services.background import process_and_save_file

router = APIRouter(prefix="/dataset", tags=["Datasets"])

# High-Concurrency O(1) Cache
COMPUTE_CACHE: Dict[Tuple[int, str, str], float] = {}

@router.post("", status_code=202)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    file_content = await file.read()
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{unique_id}_{file.filename}"
    filepath = os.path.join("uploads", filename)

    new_dataset = models.Dataset(name=name, filepath=filepath, user_id=current_user.id)
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)

    # Trigger background worker
    background_tasks.add_task(process_and_save_file, file_content, filepath)

    return {"id": new_dataset.id, "name": new_dataset.name, "detail": "Upload accepted. Processing in background."}

@router.get("", response_model=schemas.PaginatedDatasetResponse)
def get_datasets(
    page: int = 1, 
    limit: int = 5,  # Set to 5 so you can easily verify pagination works in the UI
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    skip = (page - 1) * limit
    
    # 1. Get the total count of datasets for this user
    total = db.query(models.Dataset).filter(models.Dataset.user_id == current_user.id).count()
    
    # 2. Get the specific slice of datasets for the current page
    datasets = db.query(models.Dataset).filter(models.Dataset.user_id == current_user.id).offset(skip).limit(limit).all()
    
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
    
    # Prune deleted dataset from cache
    keys_to_delete = [k for k in COMPUTE_CACHE if k[0] == dataset_id]
    for k in keys_to_delete:
        del COMPUTE_CACHE[k]
        
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
def plot_data(dataset_id: int, col1: str, col2: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id, models.Dataset.user_id == current_user.id).first()
    if not dataset or not os.path.exists(dataset.filepath):
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = pd.read_csv(dataset.filepath, nrows=30)
    if col1 not in df.columns or col2 not in df.columns:
        raise HTTPException(status_code=400, detail="Columns not found")
        
    df_plot = df[[col1, col2]].dropna()
    return {"col1": col1, "col2": col2, "data": df_plot.to_dict(orient="records")}