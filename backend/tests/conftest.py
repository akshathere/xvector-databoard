import os
import uuid
import pytest
from fastapi.testclient import TestClient
from main import app 

client = TestClient(app)

@pytest.fixture(scope="module")
def test_token():
    unique_email = f"test_{uuid.uuid4()}@xvector.com"
    client.post("/auth/register", json={"email": unique_email, "password": "testpassword"})
    res = client.post("/auth/login", json={"email": unique_email, "password": "testpassword"})
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def test_dataset_id(test_token):
    csv_content = "id,category,value,empty_col\n1,A,10,\n2,B,20,\n3,C,30,\n"
    with open("temp_test.csv", "w") as f:
        f.write(csv_content)
    
    headers = {"Authorization": f"Bearer {test_token}"}
    with open("temp_test.csv", "rb") as f:
        res = client.post(
            "/dataset", 
            headers=headers, 
            data={"name": "Edge Case Test Data"}, 
            files={"file": ("temp_test.csv", f, "text/csv")}
        )
    
    ds_id = res.json()["id"]
    yield ds_id
    
    client.delete(f"/dataset/{ds_id}", headers=headers)
    if os.path.exists("temp_test.csv"):
        os.remove("temp_test.csv")