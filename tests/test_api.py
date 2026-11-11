from playwright.sync_api import APIRequestContext, Playwright
import pytest

from tests.conftest import API_URL


@pytest.fixture
def api(playwright: Playwright):
    ctx = playwright.request.new_context(base_url=API_URL)
    yield ctx
    ctx.dispose()


def test_docs_page_is_up(api: APIRequestContext):
    assert api.get("/docs").status == 200


def test_dataset_list_requires_auth(api: APIRequestContext):
    r = api.get("/dataset")
    assert r.status in (401, 403)


def test_upload_requires_auth(api: APIRequestContext):
    r = api.post(
        "/dataset",
        multipart={
            "name": "x",
            "file": {"name": "a.csv", "mimeType": "text/csv", "buffer": b"a,b\n1,2\n"},
        },
    )
    assert r.status in (401, 403)
