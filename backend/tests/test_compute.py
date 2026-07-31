from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_compute_valid_numeric(test_token, test_dataset_id):
    headers = {"Authorization": f"Bearer {test_token}"}
    res = client.post(f"/dataset/{test_dataset_id}/compute", headers=headers, json={"column": "value", "operation": "sum"})
    assert res.status_code == 200
    assert res.json()["result"] == 60.0

def test_compute_non_numeric_column(test_token, test_dataset_id):
    headers = {"Authorization": f"Bearer {test_token}"}
    res = client.post(f"/dataset/{test_dataset_id}/compute", headers=headers, json={"column": "category", "operation": "sum"})
    assert res.status_code == 400

def test_compute_empty_column(test_token, test_dataset_id):
    headers = {"Authorization": f"Bearer {test_token}"}
    res = client.post(f"/dataset/{test_dataset_id}/compute", headers=headers, json={"column": "empty_col", "operation": "sum"})
    assert res.status_code == 400