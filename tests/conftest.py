import os
import re
from pathlib import Path

import pytest
from playwright.sync_api import Page

BASE_URL = os.getenv("BASE_URL", "http://localhost:4200")
API_URL = os.getenv("API_URL", "http://localhost:8000")
TEST_EMAIL = os.getenv("TEST_EMAIL", "test@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "password123")

SNAPSHOT_DIR = Path(__file__).parent / "snapshots"
SAMPLE_CSV = Path(__file__).parent / "sample.csv"


@pytest.fixture(scope="session")
def base_url():
    # pytest-playwright uses this fixture for page.goto("/")
    return BASE_URL


@pytest.fixture
def logged_in(page: Page) -> Page:
    """Open the app and log in. Adjust the selectors to match your login page."""
    page.goto(BASE_URL)
    page.get_by_label("Email").fill(TEST_EMAIL)
    page.get_by_label("Password").fill(TEST_PASSWORD)
    page.get_by_role("button", name=re.compile(r"log ?in|sign ?in", re.I)).click()
    page.wait_for_url(re.compile(r".*/datasets.*"))
    return page


@pytest.fixture
def match_snapshot(request):
    """Aria (accessibility tree) snapshot.
    First run saves the baseline file. Later runs compare against it.
    Delete the file in tests/snapshots/ to accept a new baseline.
    """

    def _check(locator, name: str):
        SNAPSHOT_DIR.mkdir(exist_ok=True)
        path = SNAPSHOT_DIR / f"{name}.yml"
        current = locator.aria_snapshot()
        if not path.exists():
            path.write_text(current, encoding="utf-8")
            pytest.skip(f"Baseline created: {path.name}. Re-run to compare.")
        expected = path.read_text(encoding="utf-8")
        assert current == expected, f"Snapshot '{name}' changed. Delete {path} to accept the new one."

    return _check
