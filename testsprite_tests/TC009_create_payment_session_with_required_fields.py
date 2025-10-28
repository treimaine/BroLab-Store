import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
AUTH_TOKEN = "Bearer your_valid_jwt_token_here"  # Replace with a valid token

def test_create_payment_session_with_required_fields():
    url = f"{BASE_URL}/api/payments/create-payment-session"
    headers = {
        "Authorization": AUTH_TOKEN,
        "Content-Type": "application/json"
    }
    payload = {
        "amount": 1500,
        "currency": "USD",
        "reservationId": "resv_123abc",
        "metadata": {
            "orderNumber": "ORD-4567",
            "customerNote": "Urgent payment"
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
        data = response.json()
        assert "checkoutUrl" in data, "Response JSON missing 'checkoutUrl'"
        assert isinstance(data["checkoutUrl"], str) and data["checkoutUrl"].startswith("http"), "Invalid 'checkoutUrl' value"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_create_payment_session_with_required_fields()