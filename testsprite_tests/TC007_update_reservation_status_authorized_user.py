import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Tokens for authorized and unauthorized users - these should be replaced with valid tokens for real testing
AUTHORIZED_TOKEN = "Bearer valid_authorized_user_token"
UNAUTHORIZED_TOKEN = "Bearer invalid_or_unauthorized_user_token"

def test_update_reservation_status_authorized_user():
    headers_auth = {
        "Authorization": AUTHORIZED_TOKEN,
        "Content-Type": "application/json"
    }
    headers_unauth = {
        "Authorization": UNAUTHORIZED_TOKEN,
        "Content-Type": "application/json"
    }
    
    # First, create a reservation to update
    reservation_data = {
        "serviceType": "recording",
        "preferredDate": "2024-07-01T10:00:00Z",
        "preferredDuration": 60,
        "budget": 5000,
        "notes": "Test reservation for status update",
        "clientInfo": {
            "firstName": "Test",
            "lastName": "User",
            "email": "testuser@example.com",
            "phone": "1234567890"
        }
    }
    
    reservation_id = None
    try:
        resp_create = requests.post(
            f"{BASE_URL}/api/reservations",
            headers=headers_auth,
            json=reservation_data,
            timeout=TIMEOUT
        )
        assert resp_create.status_code == 201, f"Expected 201 on reservation creation, got {resp_create.status_code}"
        reservation_id = resp_create.json().get("id")
        assert reservation_id, "Created reservation ID not returned"
        
        valid_statuses = ["draft", "pending", "confirmed", "completed", "cancelled"]
        for status in valid_statuses:
            resp_update = requests.patch(
                f"{BASE_URL}/api/reservations/{reservation_id}/status",
                headers=headers_auth,
                json={"status": status},
                timeout=TIMEOUT
            )
            assert resp_update.status_code == 200, f"Expected 200 updating status to '{status}', got {resp_update.status_code}"
        
        # Test unauthorized update attempt
        if reservation_id:
            resp_unauth = requests.patch(
                f"{BASE_URL}/api/reservations/{reservation_id}/status",
                headers=headers_unauth,
                json={"status": "confirmed"},
                timeout=TIMEOUT
            )
            assert resp_unauth.status_code == 403, f"Expected 403 for unauthorized update, got {resp_unauth.status_code}"
    finally:
        # Clean up: delete the created reservation if possible
        if reservation_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/reservations/{reservation_id}",
                    headers=headers_auth,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

test_update_reservation_status_authorized_user()