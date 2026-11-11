import re
import uuid

from playwright.sync_api import Page, expect

from tests.conftest import BASE_URL, SAMPLE_CSV


# ---------- Functional tests ----------

def test_login_page_loads(page: Page):
    page.goto(BASE_URL)
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password")).to_be_visible()


def test_upload_dataset_appears_in_table(logged_in: Page):
    page = logged_in
    name = f"pw-{uuid.uuid4().hex[:6]}"  # unique: backend rejects duplicate names

    page.get_by_placeholder("e.g. Sales 2026").fill(name)
    page.locator("input[type=file]").set_input_files(str(SAMPLE_CSV))

    expect(page.get_by_role("cell", name=name)).to_be_visible()


def test_upload_without_name_shows_error(logged_in: Page):
    page = logged_in
    page.locator("input[type=file]").set_input_files(str(SAMPLE_CSV))
    expect(page.locator(".error-banner")).to_contain_text("dataset name")


def test_plot_page_renders_chart(logged_in: Page):
    page = logged_in
    page.get_by_role("link", name=re.compile("Analyze")).first.click()
    expect(page.locator(".echart-canvas canvas")).to_be_visible()


def test_compute_shows_result(logged_in: Page):
    page = logged_in
    page.get_by_role("link", name=re.compile("Analyze")).first.click()
    page.get_by_role("button", name="Run Compute").click()
    expect(page.locator(".stats-grid")).to_contain_text("Result")


# ---------- Snapshot tests (accessibility tree) ----------

def test_login_page_snapshot(page: Page, match_snapshot):
    page.goto(BASE_URL)
    page.get_by_label("Email").wait_for()
    match_snapshot(page.locator("body"), "login_page")


def test_datasets_page_snapshot(logged_in: Page, match_snapshot):
    # Only the upload box, so the snapshot does not change when datasets are added
    match_snapshot(logged_in.locator(".upload-box"), "datasets_upload_box")
