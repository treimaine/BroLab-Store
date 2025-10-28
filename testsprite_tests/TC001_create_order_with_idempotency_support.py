import requests
import uuid

BASE_URL = "http://localhost:5000"
ORDER_ENDPOINT = "/api/orders"
TIMEOUT = 30

# Replace this with a valid Clerk JWT token for authentication
AUTH_TOKEN = "your_valid_clerk_jwt_token_here"

def test_create_order_with_idempotency_support():
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4())
    }
    payload = {
        "items": [
            {
                "productId": 123,
                "quantity": 1,
                "price": 999,
                "name": "Sample Beat"
            }
        ],
        "currency": "USD",
        "email": "customer@example.com",
        "metadata": {
            "notes": "Test order creation with idempotency"
        },
        "idempotencyKey": headers["Idempotency-Key"]
    }

    try:
        # First request with idempotency key
        response1 = requests.post(
            f"{BASE_URL}{ORDER_ENDPOINT}",
            json=payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert response1.status_code == 201, f"Expected 201, got {response1.status_code}"
        data1 = response1.json()
        assert "id" in data1 and data1["id"], "Response should contain order ID"

        # Second request with the same idempotency key to ensure no duplicate order created
        response2 = requests.post(
            f"{BASE_URL}{ORDER_ENDPOINT}",
            json=payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert response2.status_code == 201, f"Second request expected 201, got {response2.status_code}"
        data2 = response2.json()
        assert data2.get("id") == data1.get("id"), "Order ID should be the same for idempotent requests"

    finally:
        # Attempt to clean up by deleting the created order if possible
        order_id = None
        try:
            order_id = data1.get("id")
        except Exception:
            pass
        if order_id:
            try:
                del_response = requests.delete(
                    f"{BASE_URL}{ORDER_ENDPOINT}/{order_id}",
                    headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
                    timeout=TIMEOUT
                )
                # We do not assert delete response; it's cleanup
            except Exception:
                pass

test_create_order_with_idempotency_support()