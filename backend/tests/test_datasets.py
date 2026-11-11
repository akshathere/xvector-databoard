import os
import uuid
from tests.conftest import client
from routers.datasets import PLOT_CACHE
import models
from database import SessionLocal


def _upload(headers, name, content, filename="data.csv"):
    return client.post("/dataset", headers=headers, data={"name": name},
                       files={"file": (filename, content, "text/csv")})


# Rows sorted by year with a suppressed "C" value, like real survey exports
SURVEY_CSV = "year,industry,value\n" + "".join(
    f"{year},{ind},{'C' if (year, ind) == (2012, 'B') else 10}\n"
    for year in range(2011, 2014) for ind in "ABC" for _ in range(20)
)


def test_upload_is_synchronous(test_token):
    h = {"Authorization": f"Bearer {test_token}"}
    res = _upload(h, f"sync-{uuid.uuid4()}", b"a,b\n1,2\n3,4\n")
    assert res.status_code == 201
    ds = res.json()["id"]
    # File must be usable immediately after the response
    assert client.get(f"/dataset/{ds}/preview", headers=h).status_code == 200
    client.delete(f"/dataset/{ds}", headers=h)


def test_upload_ignores_client_filename(test_token):
    h = {"Authorization": f"Bearer {test_token}"}
    res = _upload(h, f"traversal-{uuid.uuid4()}", b"a\n1\n", filename="../../evil.csv")
    assert res.status_code == 201
    ds = res.json()["id"]
    db = SessionLocal()
    filepath = db.query(models.Dataset).get(ds).filepath
    db.close()
    assert os.path.dirname(filepath) == "uploads" and "evil" not in filepath
    client.delete(f"/dataset/{ds}", headers=h)


def test_duplicate_name_rejected(test_token):
    h = {"Authorization": f"Bearer {test_token}"}
    name = f"dup-{uuid.uuid4()}"
    first = _upload(h, name, b"a\n1\n")
    assert first.status_code == 201
    assert _upload(h, name.upper() + "  ", b"a\n1\n").status_code == 409
    client.delete(f"/dataset/{first.json()['id']}", headers=h)


def test_plot_aggregates_whole_file(test_token):
    h = {"Authorization": f"Bearer {test_token}"}
    ds = _upload(h, f"survey-{uuid.uuid4()}", SURVEY_CSV.encode()).json()["id"]

    res = client.get(f"/dataset/{ds}/plot", headers=h, params={"col1": "year", "col2": "value", "agg": "sum"}).json()
    # One bar per year across all rows, not the first N rows (which are all 2011); "C" values skipped
    assert res["data"] == [{"x": 2011, "y": 600}, {"x": 2012, "y": 400}, {"x": 2013, "y": 600}]

    counts = client.get(f"/dataset/{ds}/plot", headers=h, params={"col1": "industry", "col2": "value", "agg": "count"}).json()
    assert {r["x"]: r["y"] for r in counts["data"]} == {"A": 60, "B": 60, "C": 60}

    raw = client.get(f"/dataset/{ds}/plot", headers=h, params={"col1": "year", "col2": "value", "agg": "none"}).json()
    assert {r["x"] for r in raw["data"]} == {2011, 2012, 2013}

    client.delete(f"/dataset/{ds}", headers=h)


def test_plot_cache_hit_and_prune(test_token):
    h = {"Authorization": f"Bearer {test_token}"}
    ds = _upload(h, f"cache-{uuid.uuid4()}", SURVEY_CSV.encode()).json()["id"]
    params = {"col1": "year", "col2": "value", "agg": "mean"}
    r1 = client.get(f"/dataset/{ds}/plot", headers=h, params=params).json()
    r2 = client.get(f"/dataset/{ds}/plot", headers=h, params=params).json()
    assert r1["cached"] is False and r2["cached"] is True
    assert r1["data"] == r2["data"]
    client.delete(f"/dataset/{ds}", headers=h)
    assert not any(k[0] == ds for k in PLOT_CACHE)
