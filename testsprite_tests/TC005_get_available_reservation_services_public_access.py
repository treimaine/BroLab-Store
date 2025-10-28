import requests

def test_get_available_reservation_services_public_access():
    base_url = "http://localhost:5000"
    url = f"{base_url}/api/reservations/services"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        services = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(services, list), f"Expected response to be a list, got {type(services)}"

test_get_available_reservation_services_public_access()