import requests
import json

BASE_URL = "http://localhost:5000"
WEBHOOK_PATH = "/api/payments/webhook"
TIMEOUT = 30

def test_handle_payment_webhook_signature_validation():
    url = BASE_URL + WEBHOOK_PATH

    # Valid webhook payload and signature header (example)
    valid_payload = {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_123456789",
                "amount": 2000,
                "currency": "usd",
                "status": "succeeded"
            }
        }
    }
    # Assume X-Svix-Signature header is required for webhook signature validation
    headers_valid = {
        "Content-Type": "application/json",
        "X-Svix-Signature": "v1=valid_signature_example"
    }

    # Invalid signature header
    headers_invalid = {
        "Content-Type": "application/json",
        "X-Svix-Signature": "v1=invalid_signature_example"
    }

    # Test valid signature - expect 200
    try:
        response_valid = requests.post(url, headers=headers_valid, data=json.dumps(valid_payload), timeout=TIMEOUT)
        assert response_valid.status_code == 200, f"Expected 200 for valid signature, got {response_valid.status_code}"
    except requests.RequestException as e:
        assert False, f"Request with valid signature failed: {e}"

    # Test invalid signature - expect 400
    try:
        response_invalid = requests.post(url, headers=headers_invalid, data=json.dumps(valid_payload), timeout=TIMEOUT)
        assert response_invalid.status_code == 400, f"Expected 400 for invalid signature, got {response_invalid.status_code}"
    except requests.RequestException as e:
        assert False, f"Request with invalid signature failed: {e}"

test_handle_payment_webhook_signature_validation()