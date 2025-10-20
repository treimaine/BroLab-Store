import requests
import json

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Clerk test user credentials (assumed test user for authentication)
CLERK_TEST_USER = {
    "email": "testuser@example.com",
    "password": "TestPassword123!"
}

def authenticate_clerk_user():
    """Authenticate a Clerk test user, return auth token if successful."""
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLERK_TEST_USER["email"],
            "password": CLERK_TEST_USER["password"]
        }, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token")
        assert token, "Authentication token not returned"
        return token
    except Exception as e:
        raise RuntimeError(f"Authentication failed: {e}")

def create_cart_item(token=None):
    """Create a new cart item for testing and return its details."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = {
        "productId": "beat_test_001",
        "quantity": 1,
        "license": "standard"
    }
    try:
        resp = requests.post(f"{BASE_URL}/api/cart/items", json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        item = resp.json()
        assert "id" in item, "Created cart item ID not returned"
        return item
    except Exception as e:
        raise RuntimeError(f"Create cart item failed: {e}")

def update_cart_item_quantity(item_id, quantity, token=None):
    """Update the quantity of an existing cart item."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = {
        "quantity": quantity
    }
    try:
        resp = requests.put(f"{BASE_URL}/api/cart/items/{item_id}", json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        updated = resp.json()
        assert updated.get("quantity") == quantity, "Quantity update did not persist"
    except Exception as e:
        raise RuntimeError(f"Update cart item quantity failed: {e}")

def delete_cart_item(item_id, token=None):
    """Delete cart item by ID."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        resp = requests.delete(f"{BASE_URL}/api/cart/items/{item_id}", headers=headers, timeout=TIMEOUT)
        if resp.status_code not in [200, 204]:
            raise RuntimeError(f"Unexpected status deleting cart item: {resp.status_code}")
    except Exception as e:
        # Log but do not raise to allow cleanup on failure
        print(f"Warning: failed to delete cart item {item_id}: {e}")

def initiate_checkout(token=None, guest_cart_id=None):
    """Start checkout process, returns checkout session info including payment URL."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = {}
    if guest_cart_id:
        payload["guestCartId"] = guest_cart_id
    try:
        resp = requests.post(f"{BASE_URL}/api/checkout", json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        session = resp.json()
        assert "checkoutUrl" in session, "Checkout URL not returned"
        return session
    except Exception as e:
        raise RuntimeError(f"Initiate checkout failed: {e}")

def test_shopping_cart_and_checkout_flow():
    # Test guest user flow
    # Create cart item as guest
    guest_cart_item = None
    try:
        guest_cart_item = create_cart_item()
        # Update quantity
        update_cart_item_quantity(guest_cart_item["id"], 2)

        # Initiate checkout as guest using cart item (cart assumed persistent via id)
        guest_checkout_session = initiate_checkout(guest_cart_id=guest_cart_item["id"])
        assert guest_checkout_session["checkoutUrl"].startswith("http"), "Invalid guest checkout URL"

    finally:
        if guest_cart_item:
            delete_cart_item(guest_cart_item["id"])

    # Test authenticated user flow
    token = authenticate_clerk_user()
    auth_cart_item = None

    try:
        # Create cart item for authenticated user
        auth_cart_item = create_cart_item(token=token)
        # Update quantity
        update_cart_item_quantity(auth_cart_item["id"], 3, token=token)

        # Initiate checkout as authenticated user
        auth_checkout_session = initiate_checkout(token=token)
        assert auth_checkout_session["checkoutUrl"].startswith("http"), "Invalid auth checkout URL"

        # Optionally test payment processing simulation endpoint if exists
        # We assume a POST /api/payment/process for simulation here
        payment_payload = {
            "checkoutSessionId": auth_checkout_session.get("id"),
            "paymentMethod": "clerk_billing_test"
        }
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.post(f"{BASE_URL}/api/payment/process", json=payment_payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        payment_result = resp.json()
        assert payment_result.get("status") == "success", "Payment processing failed"

    finally:
        if auth_cart_item:
            delete_cart_item(auth_cart_item["id"])

test_shopping_cart_and_checkout_flow()
