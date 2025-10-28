import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Replace with a valid token for authentication
VALID_AUTH_TOKEN = "Bearer valid_auth_token_placeholder"
INVALID_AUTH_TOKEN = "Bearer invalid_auth_token_placeholder"


def create_reservation_payload():
    return {
        "serviceType": "recording_session",
        "preferredDate": "2024-12-01T14:00:00Z",
        "preferredDuration": 60,
        "budget": 15000,
        "notes": "Looking forward to a productive session",
        "clientInfo": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890"
        }
    }


def create_invalid_reservation_payload():
    # Invalid because preferredDuration is negative and budget is missing
    return {
        "serviceType": "recording_session",
        "preferredDate": "2024-12-01T14:00:00Z",
        "preferredDuration": -30,
        # "budget" omitted intentionally
        "notes": "Invalid test case",
        "clientInfo": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890"
        }
    }


def test_create_reservation_with_valid_and_invalid_data():
    headers_valid = {"Authorization": VALID_AUTH_TOKEN, "Content-Type": "application/json"}
    headers_invalid_auth = {"Authorization": INVALID_AUTH_TOKEN, "Content-Type": "application/json"}

    reservation_id = None

    # 1. Test valid reservation creation with authentication, expect 201
    try:
        valid_payload = create_reservation_payload()
        response = requests.post(
            f"{BASE_URL}/api/reservations",
            json=valid_payload,
            headers=headers_valid,
            timeout=TIMEOUT,
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        json_response = response.json()
        assert "id" in json_response or "reservationId" in json_response, "Response missing reservation ID"
        # If id is returned in response, store it for cleanup
        reservation_id = json_response.get("id") or json_response.get("reservationId")

        # 2. Test invalid data returns 400
        invalid_payload = create_invalid_reservation_payload()
        invalid_response = requests.post(
            f"{BASE_URL}/api/reservations",
            json=invalid_payload,
            headers=headers_valid,
            timeout=TIMEOUT,
        )
        assert invalid_response.status_code == 400, f"Expected 400 for invalid data, got {invalid_response.status_code}"

        # 3. Test unauthorized access returns 401
        unauthorized_response = requests.post(
            f"{BASE_URL}/api/reservations",
            json=valid_payload,
            headers={"Content-Type": "application/json"},  # no auth header
            timeout=TIMEOUT,
        )
        assert unauthorized_response.status_code == 401, f"Expected 401 for missing auth, got {unauthorized_response.status_code}"

        # Also try with an invalid token
        invalid_token_response = requests.post(
            f"{BASE_URL}/api/reservations",
            json=valid_payload,
            headers=headers_invalid_auth,
            timeout=TIMEOUT,
        )
        assert invalid_token_response.status_code == 401, f"Expected 401 for invalid token, got {invalid_token_response.status_code}"

    finally:
        # Cleanup: delete the created reservation if supported (not specified in PRD, so skipping)
        pass


test_create_reservation_with_valid_and_invalid_data()
