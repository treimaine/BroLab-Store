import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Test user credentials for Clerk authentication (assuming test API token or session token usage)
# Adjust according to actual authentication mechanism (e.g., JWT token, session cookie, etc.)
# Here we assume a test token is available.
AUTH_TOKEN = "test-clerk-auth-token"

HEADERS_AUTH = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def create_service_booking(service_type, payload):
    url = f"{BASE_URL}/api/services/book"
    json_data = {"serviceType": service_type, **payload}
    response = requests.post(url, json=json_data, headers=HEADERS_AUTH, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()

def delete_service_booking(booking_id):
    url = f"{BASE_URL}/api/services/book/{booking_id}"
    response = requests.delete(url, headers=HEADERS_AUTH, timeout=TIMEOUT)
    response.raise_for_status()
    return response.status_code

def test_service_booking_system_functionality():
    created_booking_ids = []
    try:
        # Mixing session booking
        mixing_payload = {
            "artistName": "Test Artist",
            "email": "artist@example.com",
            "deadline": "2025-09-15",
            "description": "Mixing 3 track stems",
            "durationHours": 2,
            "additionalNotes": "Please emphasize vocals."
        }
        resp_mix = create_service_booking("mixing", mixing_payload)
        assert resp_mix.get("id"), "Mixing booking response must contain id"
        created_booking_ids.append(resp_mix["id"])
        # Validate returned data matches request (partial check)
        assert resp_mix.get("serviceType") == "mixing"
        assert resp_mix.get("artistName") == mixing_payload["artistName"]

        # Mastering session booking
        mastering_payload = {
            "artistName": "Master Artist",
            "email": "master@example.com",
            "deadline": "2025-09-20",
            "description": "Mastering final mix",
            "trackCount": 1,
            "priority": "high"
        }
        resp_master = create_service_booking("mastering", mastering_payload)
        assert resp_master.get("id"), "Mastering booking response must contain id"
        created_booking_ids.append(resp_master["id"])
        assert resp_master.get("serviceType") == "mastering"
        assert resp_master.get("priority") == "high"

        # Recording session booking
        recording_payload = {
            "artistName": "Record Artist",
            "email": "record@example.com",
            "studioPreferred": "Studio A",
            "date": "2025-09-25",
            "hoursBooked": 4,
            "description": "Recording vocals and guitar"
        }
        resp_record = create_service_booking("recording-session", recording_payload)
        assert resp_record.get("id"), "Recording booking response must contain id"
        created_booking_ids.append(resp_record["id"])
        assert resp_record.get("serviceType") == "recording-session"
        assert resp_record.get("studioPreferred") == recording_payload["studioPreferred"]

        # Custom beats request booking
        custom_beats_payload = {
            "artistName": "Custom Beats Artist",
            "email": "custom@example.com",
            "genre": "Hip Hop",
            "bpm": 90,
            "description": "Need a custom beat with boom bap style",
            "deliveryDeadline": "2025-09-30"
        }
        resp_custom = create_service_booking("custom-beat-request", custom_beats_payload)
        assert resp_custom.get("id"), "Custom beat request response must contain id"
        created_booking_ids.append(resp_custom["id"])
        assert resp_custom.get("serviceType") == "custom-beat-request"
        assert resp_custom.get("genre") == custom_beats_payload["genre"]
        
    finally:
        # Cleanup: delete created bookings
        for booking_id in created_booking_ids:
            try:
                delete_service_booking(booking_id)
            except requests.RequestException:
                pass  # Ignore errors during cleanup

test_service_booking_system_functionality()