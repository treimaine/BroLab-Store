import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Placeholder for an actual valid JWT token for authentication
AUTH_TOKEN = "your_valid_jwt_token_here"

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json",
}

def create_order():
    url = f"{BASE_URL}/api/orders"
    payload = {
        "items": [
            {
                "productId": str(uuid.uuid4()),
                "quantity": 1,
                "price": 1000  # assumed price in cents
            }
        ],
        "currency": "USD",
        "email": "testuser@example.com",
        "idempotencyKey": str(uuid.uuid4())
    }
    # The PRD schema shows "items" as array of order items, but order items schema isn't fully detailed.
    # We'll use a minimal plausible item representation.
    # If API rejects due to item format, adjust accordingly in real case.
    # Here, adjust payload to have minimal valid items per the API design for testing.
    payload["items"] = [{"productId": 1, "quantity": 1}]  # simple valid items as integer productId from doc unknown
    response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()["id"] if "id" in response.json() else response.json().get("orderId")

def delete_order(order_id):
    # No DELETE endpoint specified in PRD for order, can't delete. So skip deletion.
    # We'll just leave as is.
    pass

def test_get_order_invoice_url_availability():
    order_id = None
    try:
        # Create order if no order ID provided
        order_id = create_order()
        assert order_id is not None, "Failed to create order, no order ID returned"

        url = f"{BASE_URL}/api/orders/{order_id}/invoice"

        response = requests.get(url, headers=headers, timeout=TIMEOUT)

        if response.status_code == 200:
            data = response.json()
            # Expect the response to contain invoice URL
            assert isinstance(data, dict), "Response JSON is not an object"
            assert "url" in data and isinstance(data["url"], str) and data["url"].startswith("http"), "Invoice URL missing or invalid"
        else:
            # Expect 404 if invoice not ready
            assert response.status_code == 404, f"Unexpected status code {response.status_code}, expected 200 or 404"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

    finally:
        # No API to delete order, so no cleanup for order
        pass

test_get_order_invoice_url_availability()