import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Mock authentication tokens (these should be replaced with valid tokens for a real test environment)
AUTH_TOKEN_VALID = "Bearer valid_user_token"
AUTH_TOKEN_FORBIDDEN = "Bearer forbidden_user_token"

def test_get_order_by_id_authorization_and_existence():
    headers_valid = {
        "Authorization": AUTH_TOKEN_VALID,
        "Content-Type": "application/json"
    }
    headers_forbidden = {
        "Authorization": AUTH_TOKEN_FORBIDDEN,
        "Content-Type": "application/json"
    }
    
    # Order creation payload (simple example)
    order_payload = {
        "items": [{"productId": 1, "quantity": 1}],
        "currency": "USD",
        "email": "testuser@example.com",
        "metadata": {"testKey": "testValue"},
        "idempotencyKey": str(uuid.uuid4())
    }

    # Create an order to get a valid order ID for testing
    order_id = None
    try:
        create_resp = requests.post(
            f"{BASE_URL}/api/orders",
            headers=headers_valid,
            json=order_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Order creation failed with status {create_resp.status_code}"
        order_data = create_resp.json()
        order_id = order_data.get("id")
        assert order_id, "Created order response missing 'id'"

        # 1. Test 200 for valid access (valid token and existing order)
        get_resp = requests.get(
            f"{BASE_URL}/api/orders/{order_id}",
            headers=headers_valid,
            timeout=TIMEOUT
        )
        assert get_resp.status_code == 200, f"Valid access failed, expected 200 got {get_resp.status_code}"
        resp_json = get_resp.json()
        assert resp_json.get("id") == order_id, "Returned order ID does not match requested ID"

        # 2. Test 403 for forbidden access (using forbidden token on existing order)
        get_forbidden_resp = requests.get(
            f"{BASE_URL}/api/orders/{order_id}",
            headers=headers_forbidden,
            timeout=TIMEOUT
        )
        assert get_forbidden_resp.status_code == 403, f"Forbidden access not enforced, expected 403 got {get_forbidden_resp.status_code}"

        # 3. Test 404 if order does not exist (use a UUID unlikely to exist)
        non_existent_order_id = "00000000-0000-0000-0000-000000000000"
        get_404_resp = requests.get(
            f"{BASE_URL}/api/orders/{non_existent_order_id}",
            headers=headers_valid,
            timeout=TIMEOUT
        )
        assert get_404_resp.status_code == 404, f"Non-existent order did not return 404, got {get_404_resp.status_code}"

    finally:
        # Cleanup: delete the created order if possible
        if order_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/orders/{order_id}",
                    headers=headers_valid,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

test_get_order_by_id_authorization_and_existence()