import requests
import json
import time

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Clerk test user credentials (assumed available for testing)
CLERK_TEST_EMAIL = "test_user@example.com"
CLERK_TEST_PASSWORD = "TestPassword123!"

# Subscription plans known in the system for selection
SUBSCRIPTION_PLANS = ["Basic", "Artist", "Ultimate"]


def authenticate_clerk_user(email: str, password: str) -> dict:
    """Authenticate Clerk test user and retrieve auth tokens, including session token."""
    login_url = f"{BASE_URL}/api/auth/login"
    payload = {"email": email, "password": password}
    resp = requests.post(login_url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_auth_headers(session_token: str) -> dict:
    """Return the Authorization headers for authenticated requests."""
    return {
        "Authorization": f"Bearer {session_token}",
        "Content-Type": "application/json",
    }


def get_available_plans(headers: dict) -> list:
    url = f"{BASE_URL}/api/subscription/plans"
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json().get("plans", [])


def select_subscription_plan(headers: dict, plan_id: str) -> dict:
    url = f"{BASE_URL}/api/subscription/select"
    payload = {"planId": plan_id}
    resp = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_subscription_status(headers: dict) -> dict:
    url = f"{BASE_URL}/api/subscription/status"
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_billing_history(headers: dict) -> dict:
    url = f"{BASE_URL}/api/billing/history"
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_quota_info(headers: dict) -> dict:
    url = f"{BASE_URL}/api/subscription/quota"
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def test_subscription_plans_and_billing_integration():
    try:
        # Authenticate test user
        auth_data = authenticate_clerk_user(CLERK_TEST_EMAIL, CLERK_TEST_PASSWORD)
        # Adjusted token retrieval to include likely keys from response (token, access_token)
        session_token = auth_data.get("sessionToken") or auth_data.get("session_token") or auth_data.get("sessionId") or auth_data.get("token") or auth_data.get("access_token")
        assert session_token, f"Session token missing after authentication. Response keys: {list(auth_data.keys())}"
        headers = get_auth_headers(session_token)

        # Retrieve available subscription plans and verify expected plans presence
        plans = get_available_plans(headers)
        assert isinstance(plans, list) and plans, "No subscription plans returned"
        plan_names = [plan["name"] for plan in plans]
        for expected_plan in SUBSCRIPTION_PLANS:
            assert expected_plan in plan_names, f"Expected plan '{expected_plan}' not found"

        # Select the first subscription plan (simulate plan selection)
        selected_plan = plans[0]
        plan_id = selected_plan.get("id")
        assert plan_id, "Plan id missing in selected plan"

        select_response = select_subscription_plan(headers, plan_id)
        assert select_response.get("success") is True, "Subscription plan selection failed"

        # Small delay for backend processing/billing update
        time.sleep(2)

        # Verify subscription status reflects the selected plan
        status = get_subscription_status(headers)
        assert status.get("planId") == plan_id, "Subscription status plan ID mismatch"
        assert status.get("active") is True, "Subscription status not active after selection"

        # Verify quota management data is returned and consistent
        quota = get_quota_info(headers)
        assert "used" in quota and "limit" in quota, "Quota info incomplete"
        assert isinstance(quota["used"], int) and isinstance(quota["limit"], int), "Quota values invalid"
        assert quota["used"] <= quota["limit"], "Quota used exceeds limit"

        # Verify billing history shows recent subscription action
        billing_history = get_billing_history(headers)
        assert "invoices" in billing_history and isinstance(billing_history["invoices"], list), "Billing history missing invoices list"
        invoices = billing_history["invoices"]
        assert any(plan_id in (inv.get("planId") or "") for inv in invoices), "No invoice found related to selected subscription plan"

    except Exception as e:
        raise AssertionError(f"Test TC006 failed: {e}")


test_subscription_plans_and_billing_integration()
