import requests
from requests.exceptions import RequestException
from datetime import datetime

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
CLERK_TEST_USER_EMAIL = "testuser@clerk.dev"
CLERK_TEST_USER_PASSWORD = "TestPassword123!"

def authenticate_user(email, password):
    """Authenticate via Clerk and return session token or cookie."""
    try:
        # Attempt sign-in
        resp = requests.post(
            f"{BASE_URL}/api/auth/sign-in",
            json={"email": email, "password": password},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        json_resp = resp.json()
        if "sessionToken" in json_resp:
            return json_resp["sessionToken"]
        elif "accessToken" in json_resp:
            return json_resp["accessToken"]
        # fallback to cookies or tokens in headers
        return None
    except RequestException as e:
        raise RuntimeError(f"Authentication failed: {e}")

def get_auth_headers(token):
    """Build auth headers based on Clerk token."""
    # Assuming Bearer token usage for API
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}

def validate_dashboard_section(title, data):
    """Check a section data validity."""
    assert data is not None, f"{title} data is None"
    assert isinstance(data, dict) or isinstance(data, list), f"{title} data unexpected type"
    # Basic sanity checks
    if title == "analytics":
        # Expect keys like pageViews, playCounts, etc.
        assert "pageViews" in data or "playCounts" in data, f"{title} missing expected keys"
    elif title == "order_history":
        # Should be a list of order dicts with orderId and date
        assert isinstance(data, list), f"{title} not a list"
        if data:
            sample_order = data[0]
            assert "orderId" in sample_order and "date" in sample_order, f"{title} missing orderId or date"
    elif title == "downloads":
        # Should be list or dict showing downloadable items or counts
        assert isinstance(data, list) or isinstance(data, dict), f"{title} unexpected format"
    elif title == "subscription_status":
        # Should indicate plan and status
        assert "plan" in data and "status" in data, f"{title} missing plan or status"

def test_user_dashboard_analytics_and_downloads():
    report_md = []

    # Step 1: Authenticate test user
    try:
        token = authenticate_user(CLERK_TEST_USER_EMAIL, CLERK_TEST_USER_PASSWORD)
    except Exception as e:
        raise AssertionError(f"Failed to authenticate test user: {e}")
    assert token is not None, "Authentication token not obtained"

    headers = get_auth_headers(token)

    endpoints = {
        "analytics": "/api/dashboard/analytics",
        "order_history": "/api/dashboard/orders",
        "downloads": "/api/dashboard/downloads",
        "subscription_status": "/api/dashboard/subscription",
    }
    results = {}

    for section, path in endpoints.items():
        url = BASE_URL + path
        try:
            resp = requests.get(url, headers=headers, timeout=TIMEOUT)
            resp.raise_for_status()
        except RequestException as e:
            raise AssertionError(f"Failed to fetch {section} data: {e}")

        try:
            data = resp.json()
        except ValueError:
            raise AssertionError(f"Invalid JSON response from {section} endpoint")

        # Validate data content per section
        try:
            validate_dashboard_section(section, data)
            result = "PASS"
        except AssertionError as err:
            result = f"FAIL - {err}"
        results[section] = {"result": result, "data": data}

    # Construct report content: markdown
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    md_lines = [f"# Test Report: TC004 - User Dashboard Analytics and Downloads",
                f"**Test Date:** {now}",
                "",
                "## Summary Results",
                "| Section | Result |",
                "|---------|---------|"]
    for section, info in results.items():
        md_lines.append(f"| {section} | {info['result']} |")
    md_lines.append("\n## Detailed Data Snapshots")
    for section, info in results.items():
        md_lines.append(f"### {section.capitalize()}\n```json\n{info['data']}\n```")

    report_md_content = "\n".join(md_lines)
    report_md.append(report_md_content)

    # Assertions to enforce pass on all
    for section, info in results.items():
        assert info["result"] == "PASS", f"Section {section} failed validation: {info['result']}"

    # Output or save report files could be done here. For now just print.
    print(report_md_content)


test_user_dashboard_analytics_and_downloads()